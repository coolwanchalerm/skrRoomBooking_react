import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { DB } from '../../services/db';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('teacher');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [roleFilter, setRoleFilter] = useState('');
  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => {
      window.removeEventListener('db-synced', loadData);
    };
  }, []);

  const loadData = () => {
    setUsers(DB.getUsers());
  };

  const getUniqueDepartments = () => {
    const allUsers = DB.getUsers();
    const depts = allUsers.map((u: any) => u.department).filter(Boolean);
    return [...new Set(depts)] as string[];
  };

  const openModal = (id: string | null = null) => {
    setEditId(id);
    if (id) {
      const u = users.find(user => String(user.id) === String(id));
      if (u) {
        setUsername(u.username || '');
        setFullname(u.fullname || '');
        setPhone(u.phone || '');
        setDepartment(u.department || '');
        setRole(u.role || 'teacher');
      }
    } else {
      setUsername('');
      setFullname('');
      setPhone('');
      setDepartment('');
      setRole('teacher');
    }
    setAlertMessage(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAlertMessage(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMessage(null);
    
    const trimUsername = username.trim();
    const trimPhone = phone.trim();
    
    // Validate Phone Number
    if (!/^0[0-9]{8,9}$/.test(trimPhone)) {
      setAlertMessage({ type: 'error', text: 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 9-10 หลัก)' });
      return;
    }
    
    // Check duplicate username
    const isDuplicate = users.some(u => 
      String(u.username).toLowerCase() === trimUsername.toLowerCase() && 
      String(u.id) !== String(editId)
    );
    
    if (isDuplicate) {
      setAlertMessage({ type: 'error', text: 'ชื่อผู้ใช้งาน (Username) นี้มีในระบบแล้ว กรุณาใช้ชื่ออื่น' });
      return;
    }

    setIsSaving(true);
    
    const userData = {
      username: trimUsername,
      fullname: fullname.trim(),
      phone: trimPhone,
      department,
      role
    };

    try {
      if (editId) {
        await DB.updateUser(editId, userData);
      } else {
        await DB.addUser(userData);
      }
      Swal.fire({icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false});
      loadData();
      closeModal();
    } catch (err: any) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({
      title: 'ยืนยันการลบสมาชิก?',
      text: "ลบแล้วไม่สามารถกู้คืนได้ (ยกเว้นแก้ไขใน Google Sheet โดยตรง)",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    }).then(async (res) => {
      if(res.isConfirmed){
        setDeletingId(id);
        try {
          await DB.deleteUser(id);
          Swal.fire({icon: 'success', title: 'ลบสำเร็จ', timer:1500, showConfirmButton:false});
          loadData();
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const filtered = users.filter(u => {
    let ok = true;
    if (roleFilter) ok = ok && u.role === roleFilter;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      ok = ok && (
        u.username?.toLowerCase().includes(q) ||
        u.fullname?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    }
    return ok;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="page-fade">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h4 className="mb-0 text-navy font-display" style={{ fontWeight: 800 }}>
          <i className="bi bi-people-fill text-primary me-2"></i> จัดการข้อมูลผู้ใช้งาน
        </h4>
        <button className="btn btn-primary rounded-pill px-4" style={{ fontWeight: 600, boxShadow: '0 4px 10px rgba(14,42,74,0.15)' }} onClick={() => openModal()}>
          <i className="bi bi-plus-lg me-1"></i> เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div className="modern-filter-container mt-3 mb-4">
        <div className="filter-tabs-scroll">
          <button className={`filter-btn ${roleFilter === '' ? 'active' : ''}`} onClick={() => { setRoleFilter(''); setCurrentPage(1); }}>ทั้งหมด</button>
          <button className={`filter-btn ${roleFilter === 'admin' ? 'active' : ''}`} onClick={() => { setRoleFilter('admin'); setCurrentPage(1); }}>แอดมิน</button>
          <button className={`filter-btn ${roleFilter === 'user' ? 'active' : ''}`} onClick={() => { setRoleFilter('user'); setCurrentPage(1); }}>ครู/บุคลากร</button>
        </div>
        <div className="filter-controls">
          <input className="filter-control-item" placeholder="ค้นหาชื่อ, เบอร์โทร, แผนก..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: '220px' }} />
        </div>
      </div>

      <div className="row g-4">
        {paginated.length === 0 ? (
          <div className="col-12 text-center text-muted py-5">
            <i className="bi bi-person-x fs-1 d-block mb-3 opacity-50"></i>
            ไม่พบข้อมูลผู้ใช้งาน
          </div>
        ) : (
          paginated.map((u) => (
            <div key={u.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <div className={`mobile-card status-${u.role === 'admin' ? 'approved' : 'pending'}`}>
                <div className="mobile-card-header">
                  <h6 className="mobile-card-title text-truncate" title={u.fullname || u.username}>{u.fullname || u.username}</h6>
                  <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                    <span className="badge-status" style={{color: 'white', background: 'transparent', padding: 0}}>
                      {u.role === 'admin' ? <><i className="bi bi-shield-lock-fill"></i> แอดมิน</> : <><i className="bi bi-person-fill"></i> ครู</>}
                    </span>
                  </span>
                </div>
                <div className="mobile-card-body">
                  <p className="mb-2"><i className="bi bi-person"></i> <strong>@{u.username}</strong></p>
                  <p className="mb-2"><i className="bi bi-building"></i> {u.department || 'ไม่ได้ระบุสังกัด'}</p>
                  <p className="mb-0"><i className="bi bi-telephone"></i> {u.phone || '-'}</p>
                </div>
                <div className="mobile-card-actions">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openModal(u.id)}>
                    <i className="bi bi-pencil"></i> แก้ไข
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)} disabled={deletingId === u.id}>
                    {deletingId === u.id ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-trash"></i> ลบ</>}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-5">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <a className="page-link border-0 shadow-sm rounded-start-pill" href="#" onClick={(e) => handlePageChange(e, currentPage - 1)}>
                <i className="bi bi-chevron-left"></i>
              </a>
            </li>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <a 
                  className="page-link border-0 shadow-sm mx-1" 
                  href="#" 
                  onClick={(e) => handlePageChange(e, page)}
                  style={{ borderRadius: '8px' }}
                >
                  {page}
                </a>
              </li>
            ))}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <a className="page-link border-0 shadow-sm rounded-end-pill mx-1" href="#" onClick={(e) => handlePageChange(e, currentPage + 1)}>
                <i className="bi bi-chevron-right"></i>
              </a>
            </li>
          </ul>
        </nav>
      )}

      {/* User Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(14, 42, 74, 0.4)', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px', overflow: 'hidden' }}>
              <div className="modal-header border-0 bg-light px-4 pt-4 pb-3">
                <h5 className="modal-title font-display fw-bold text-navy">
                  <i className={`bi ${editId ? 'bi-pencil-square' : 'bi-person-plus-fill'} text-primary me-2`}></i>
                  {editId ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}
                </h5>
                <button type="button" className="btn-close shadow-none" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body px-4 py-3">
                  {alertMessage && (
                    <div className={`alert alert-${alertMessage.type === 'error' ? 'danger' : 'success'} py-2 mb-3 d-flex align-items-center gap-2 rounded-3`} style={{ fontSize: '14px' }}>
                      <i className={`bi bi-${alertMessage.type === 'error' ? 'exclamation-circle' : 'check-circle'}-fill`}></i> 
                      {alertMessage.text}
                    </div>
                  )}
                  
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold text-navy small mb-1">ชื่อผู้ใช้งาน (Username) <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        style={{ padding: '10px 14px' }}
                        required 
                        value={username}
                        onChange={e => { setUsername(e.target.value); setAlertMessage(null); }}
                      />
                      <div className="form-text" style={{ fontSize: '12px' }}>ใช้สำหรับเข้าสู่ระบบ</div>
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-semibold text-navy small mb-1">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        style={{ padding: '10px 14px' }}
                        required 
                        value={fullname}
                        onChange={e => setFullname(e.target.value)}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-semibold text-navy small mb-1">เบอร์โทรศัพท์ (รหัสผ่านเริ่มต้น) <span className="text-danger">*</span></label>
                      <input 
                        type="tel" 
                        className="form-control rounded-3" 
                        style={{ padding: '10px 14px' }}
                        required 
                        maxLength={10}
                        value={phone}
                        onChange={e => { 
                          const val = e.target.value.replace(/\D/g, '');
                          setPhone(val); 
                          setAlertMessage(null); 
                        }}
                      />
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-semibold text-navy small mb-1">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน</label>
                      <select 
                        className="form-select rounded-3" 
                        style={{ padding: '10px 14px' }}
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                      >
                        <option value="">-- ไม่ระบุ / อื่นๆ --</option>
                        {getUniqueDepartments().map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-12">
                      <label className="form-label fw-semibold text-navy small mb-1">ระดับสิทธิ์ (Role) <span className="text-danger">*</span></label>
                      <select 
                        className="form-select rounded-3" 
                        style={{ padding: '10px 14px' }}
                        required
                        value={role}
                        onChange={e => setRole(e.target.value)}
                      >
                        <option value="teacher">ครู / บุคลากร (จองห้องได้เท่านั้น)</option>
                        <option value="admin">ผู้ดูแลระบบ (อนุมัติได้, จัดการระบบได้)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 pb-4 pt-2">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={closeModal} style={{ fontWeight: 600 }}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={isSaving} style={{ fontWeight: 600, boxShadow: '0 4px 10px rgba(14,42,74,0.15)' }}>
                    {isSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...</> : 'บันทึกข้อมูล'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
