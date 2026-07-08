import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { DB } from '../../services/db';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
        try {
          await DB.deleteUser(id);
          Swal.fire({icon: 'success', title: 'ลบสำเร็จ', timer:1500, showConfirmButton:false});
          loadData();
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
      }
    });
  };

  const filtered = users.filter(u => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.fullname?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
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
      <div className="panel">
        <div className="panel-head flex-wrap gap-2">
          <h6><i className="bi bi-people"></i> จัดการข้อมูลผู้ใช้งาน</h6>
          <div className="d-flex flex-wrap gap-2">
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="ค้นหาชื่อ, เบอร์โทร..." 
              style={{ width: '200px' }}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <button className="btn btn-sm btn-primary-soft" onClick={() => openModal()}><i className="bi bi-plus-lg"></i> เพิ่มผู้ใช้งาน</button>
          </div>
        </div>
        <div className="panel-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th className="ps-3">#</th>
                  <th>Username</th>
                  <th>ชื่อ-สกุล</th>
                  <th>เบอร์โทร</th>
                  <th>กลุ่มสาระฯ / ฝ่ายงาน</th>
                  <th>สิทธิ์</th>
                  <th className="text-end pe-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted py-4">ไม่มีข้อมูลสมาชิก</td></tr>
                ) : (
                  paginated.map((u, i) => (
                    <tr key={u.id}>
                      <td className="ps-3">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.fullname || "-"}</td>
                      <td>{u.phone || "-"}</td>
                      <td>{u.department || "-"}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                          {u.role === 'admin' ? 'แอดมิน' : 'ครู / บุคลากร'}
                        </span>
                      </td>
                      <td className="text-end text-nowrap pe-3">
                        <button className="btn-action act-edit" title="แก้ไข" onClick={() => openModal(u.id)}><i className="bi bi-pencil"></i></button>
                        <button className="btn-action act-cancel" title="ลบ" onClick={() => handleDelete(u.id)}><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-3 py-2 border-top">
              <nav aria-label="Page navigation" className="mt-3">
                <ul className="pagination pagination-sm justify-content-end mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" onClick={(e) => handlePageChange(e, currentPage - 1)} style={{ color: 'var(--navy)', borderColor: 'var(--line)' }}>ก่อนหน้า</a>
                  </li>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                      <a 
                        className="page-link" 
                        href="#" 
                        onClick={(e) => handlePageChange(e, page)}
                        style={currentPage === page ? { backgroundColor: 'var(--navy)', borderColor: 'var(--navy)', color: '#fff' } : { color: 'var(--navy)', borderColor: 'var(--line)' }}
                      >
                        {page}
                      </a>
                    </li>
                  ))}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <a className="page-link" href="#" onClick={(e) => handlePageChange(e, currentPage + 1)} style={{ color: 'var(--navy)', borderColor: 'var(--line)' }}>ถัดไป</a>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title">{editId ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSaveUser}>
                <div className="modal-body p-4">
                  {alertMessage && (
                    <div className={`alert alert-${alertMessage.type === 'error' ? 'danger' : 'success'} py-2 mb-3 d-flex align-items-center gap-2`}>
                      <i className={`bi bi-${alertMessage.type === 'error' ? 'exclamation-circle' : 'check-circle'}-fill`}></i> 
                      {alertMessage.text}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">ชื่อผู้ใช้งาน (Username) <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={username}
                      onChange={e => { setUsername(e.target.value); setAlertMessage(null); }}
                    />
                    <div className="form-text">ใช้สำหรับเข้าสู่ระบบ</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ชื่อ-นามสกุล <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={fullname}
                      onChange={e => setFullname(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">เบอร์โทรศัพท์ (ใช้เป็นรหัสผ่าน) <span className="text-danger">*</span></label>
                    <input 
                      type="tel" 
                      className="form-control" 
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
                  <div className="mb-3">
                    <label className="form-label">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน</label>
                    <select 
                      className="form-select" 
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    >
                      <option value="">-- ไม่ระบุ / อื่นๆ --</option>
                      {getUniqueDepartments().map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ระดับสิทธิ์ (Role) <span className="text-danger">*</span></label>
                    <select 
                      className="form-select" 
                      required
                      value={role}
                      onChange={e => setRole(e.target.value)}
                    >
                      <option value="teacher">ครู / บุคลากร (จองห้องได้เท่านั้น)</option>
                      <option value="admin">ผู้ดูแลระบบ (อนุมัติได้, จัดการระบบได้)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? <><span className="spinner-border spinner-border-sm"></span> กำลังบันทึก...</> : 'บันทึกข้อมูล'}
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
