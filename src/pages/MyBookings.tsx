import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DB } from '../services/db';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

export default function MyBookings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const navigate = useNavigate();

  // -------------------------
  // ADMIN STATE (New UI)
  // -------------------------
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // -------------------------
  // COMMON STATE
  // -------------------------
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => {
      window.removeEventListener('db-synced', loadData);
    };
  }, [user]);

  const loadData = () => {
    if (user) {
      const allBookings = DB.getBookings();
      if (isAdmin) {
        // Sort by date descending
        allBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(allBookings);
      } else {
        const myBookings = allBookings.filter((b: any) => String(b.userId) === String(user.id));
        myBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(myBookings);
      }
    }
    setRooms(DB.getRooms());
    setUsers(DB.getUsers());
  };

  const getRoomName = (roomId: number) => {
    const room = rooms.find(r => String(r.id) === String(roomId));
    return room ? room.name : 'ไม่ทราบชื่อห้อง';
  };
  
  const getRoomColor = (roomId: number) => {
    const room = rooms.find(r => String(r.id) === String(roomId));
    return room ? room.color : '#d62424';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>;
      case 'approved': return <span className="badge-status badge-approved"><i className="bi bi-check-circle-fill"></i> อนุมัติ</span>;
      case 'cancelled': return <span className="badge-status badge-cancelled"><i className="bi bi-x-circle-fill"></i> ยกเลิก</span>;
      default: return null;
    }
  };

  // -------------------------
  // FILTERING LOGIC
  // -------------------------
  const getFilteredBookings = () => {
    return bookings.filter(b => {
      if (fromDate && new Date(b.date) < new Date(fromDate)) return false;
      if (toDate && new Date(b.date) > new Date(toDate)) return false;
      if (filterRoom && String(b.roomId) !== String(filterRoom)) return false;
      if (filterStatus && b.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTopic = b.topic?.toLowerCase().includes(q);
        const matchDept = b.department?.toLowerCase().includes(q);
        const matchName = b.bookerName?.toLowerCase().includes(q);
        if (!matchTopic && !matchDept && !matchName) return false;
      }
      return true;
    });
  };

  const filtered = getFilteredBookings();

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFromDateChange = (val: string) => {
    if (toDate && val > toDate) {
      alert('วันเริ่มต้นต้องน้อยกว่าหรือเท่ากับวันสิ้นสุด');
      return;
    }
    setFromDate(val);
    setCurrentPage(1);
  };

  const handleToDateChange = (val: string) => {
    if (fromDate && val < fromDate) {
      alert('วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น');
      return;
    }
    setToDate(val);
    setCurrentPage(1);
  };

  const handlePageChange = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper for admin to get user info if internal
  const getBookerInfo = (b: any) => {
    if (b.isExternal) {
      return {
        name: b.bookerName,
        dept: b.department,
        isExternal: true
      };
    } else {
      const u = users.find(u => String(u.id) === String(b.userId));
      return {
        name: u ? (u.fullname || u.name) : b.bookerName,
        dept: u ? u.department : b.department,
        isExternal: false
      };
    }
  };


  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบข้อมูลการจองนี้ออกจากระบบอย่างถาวรใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeletingId(id);
        try {
          await DB.deleteBooking(id);
          Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
          loadData();
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบข้อมูลได้' });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleView = (b: any) => {
    setSelectedBooking(b);
  };

  const closeViewModal = () => {
    setSelectedBooking(null);
  };

  const handleEdit = (b: any) => {
    if (!isAdmin) {
      if (String(b.userId) !== String(user?.id)) {
        Swal.fire({ icon: 'error', title: 'ไม่มีสิทธิ์แก้ไข', text: 'คุณสามารถแก้ไขได้เฉพาะรายการจองของตัวเองเท่านั้น' });
        return;
      }
      if (b.status !== 'pending') {
        const statusText = b.status === 'approved' ? 'อนุมัติแล้ว' : 'ยกเลิกแล้ว';
        Swal.fire({ icon: 'warning', title: 'ไม่สามารถแก้ไขได้', text: `ไม่สามารถแก้ไขรายการที่ "${statusText}" ได้ สามารถแก้ไขได้เฉพาะรายการที่สถานะ "รออนุมัติ" เท่านั้น` });
        return;
      }
    }
    navigate('/booking', { state: { editBookingId: b.id } });
  };

  return (
    <div className="page-fade">
      <div className="panel">
        
        {/* HEADER */}
        <div className="panel-head flex-wrap gap-2">
          {isAdmin ? (
            <h6 id="myBookingsTitle"><i className="bi bi-card-checklist"></i> รายการจองทั้งหมด</h6>
          ) : (
            <h6 id="myBookingsTitle"><i className="bi bi-card-checklist"></i> รายการจองของฉัน</h6>
          )}
        </div>

        {/* FILTER BAR */}
        <div className="modern-filter-container mt-3">
          <div className="filter-tabs-scroll">
            <button 
              className={`filter-btn ${filterStatus === '' ? 'active' : ''}`}
              onClick={() => { setFilterStatus(''); setCurrentPage(1); }}
            >
              ทั้งหมด
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('pending'); setCurrentPage(1); }}
            >
              รออนุมัติ
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'approved' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('approved'); setCurrentPage(1); }}
            >
              อนุมัติ
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
              onClick={() => { setFilterStatus('cancelled'); setCurrentPage(1); }}
            >
              ยกเลิก
            </button>
          </div>
          <div className="filter-controls">
            <input 
              type="text" 
              className="filter-control-item" 
              placeholder="ค้นหา..." 
              value={searchQuery} 
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '130px' }}
            />
            <input 
              type="date" 
              className="filter-control-item" 
              title="จากวันที่"
              value={fromDate} 
              max={toDate || undefined} 
              onChange={e => handleFromDateChange(e.target.value)} 
            />
            <input 
              type="date" 
              className="filter-control-item" 
              title="ถึงวันที่"
              value={toDate} 
              min={fromDate || undefined} 
              onChange={e => handleToDateChange(e.target.value)} 
            />
            <select 
              className="filter-control-item" 
              value={filterRoom} 
              onChange={e => { setFilterRoom(e.target.value); setCurrentPage(1); }}
            >
              <option value="">ทุกห้องประชุม</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div className="panel-body p-0">
          
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0" id="mbTable">
              <thead>
                <tr>
                  <th className="ps-3">#</th>
                  <th>ผู้จอง / ฝ่าย</th>
                  <th>ห้อง</th>
                  <th>หัวข้อ</th>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>อุปกรณ์</th>
                  <th>สถานะ</th>
                  <th className="pe-3 text-end">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted border-0">
                      <div className="empty-state" id="mbEmpty">
                        <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                        <p className="mb-0">ยังไม่มีรายการจอง</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((b, index) => {
                    const roomName = getRoomName(b.roomId);
                    const roomColor = getRoomColor(b.roomId);
                    const bInfo = getBookerInfo(b);
                    const displayDate = new Date(b.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

                    return (
                      <tr key={b.id}>
                        <td className="ps-3">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>
                          <strong>{bInfo.name}</strong>
                          {bInfo.isExternal && <span className="badge bg-secondary-subtle text-secondary ms-1">ภายนอก</span>}
                          <br /><span className="text-muted" style={{ fontSize: '11.5px' }}><i className="bi bi-tag-fill"></i> {bInfo.dept}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: roomColor, color: 'white', fontWeight: 500 }}>
                            {roomName}
                          </span>
                        </td>
                        <td style={{ maxWidth: '250px' }} className="text-truncate">{b.topic}</td>
                        <td>{displayDate}</td>
                        <td>{b.timeStart} - {b.timeEnd}</td>
                        <td>{b.equipment ? (Array.isArray(b.equipment) ? b.equipment.join(', ') : b.equipment) : '-'}</td>
                        <td>{getStatusBadge(b.status)}</td>
                        <td className="pe-3 text-end text-nowrap">
                          <button className="btn-action act-view me-1" title="ดูรายละเอียด" onClick={() => handleView(b)}><i className="bi bi-eye"></i></button>
                          {b.status === 'pending' && (
                            <button className="btn-action act-edit me-1" title="แก้ไข" onClick={() => handleEdit(b)}><i className="bi bi-pencil"></i></button>
                          )}
                          {(isAdmin || b.status === 'pending') && (
                            <button className="btn-action act-cancel" title="ลบการจอง" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}>
                              {deletingId === b.id ? <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem', borderWidth: '0.15em' }}></span> : <i className="bi bi-trash"></i>}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="d-block d-md-none p-3 bg-light">
            {paginated.length === 0 ? (
              <div className="text-center py-5 text-muted border-0">
                <div className="empty-state">
                  <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                  <p className="mb-0">ยังไม่มีรายการจอง</p>
                </div>
              </div>
            ) : (
              paginated.map(b => {
                const roomName = getRoomName(b.roomId);
                const bInfo = getBookerInfo(b);
                const displayDate = new Date(b.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                const equipment = b.equipment ? (Array.isArray(b.equipment) ? b.equipment.join(', ') : b.equipment) : '-';

                return (
                  <div key={b.id} className={`mobile-card status-${b.status}`}>
                    <div className="mobile-card-header">
                      <h6 className="mobile-card-title">{b.topic}</h6>
                      <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                        {getStatusBadge(b.status)}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p className="mb-2"><i className="bi bi-person"></i> <strong>{bInfo.name}</strong> {bInfo.isExternal && <span className="badge bg-secondary-subtle text-secondary ms-1">ภายนอก</span>}</p>
                      <p className="mb-2"><i className="bi bi-tag-fill"></i> {bInfo.dept}</p>
                      <p className="mb-2"><i className="bi bi-geo-alt"></i> <strong>{roomName}</strong></p>
                      <p className="mb-2"><i className="bi bi-calendar-event"></i> {displayDate}</p>
                      <p className="mb-2"><i className="bi bi-clock"></i> {b.timeStart} - {b.timeEnd}</p>
                      <p className="mb-0"><i className="bi bi-tv"></i> อุปกรณ์: {equipment}</p>
                    </div>
                    <div className="mobile-card-actions">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => handleView(b)}>รายละเอียด</button>
                      {b.status === 'pending' && (
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEdit(b)}>แก้ไข</button>
                      )}
                      {(isAdmin || b.status === 'pending') && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id}>
                          {deletingId === b.id ? <span className="spinner-border spinner-border-sm"></span> : 'ลบ'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div id="mbPagination" className="px-3 py-2 border-top">
              <nav aria-label="Page navigation" className="mt-3 no-print">
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

      {/* DETAIL MODAL */}
      {selectedBooking && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeViewModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-card-text"></i> รายละเอียดการจอง</h5>
                <button type="button" className="btn-close" onClick={closeViewModal}></button>
              </div>
              <div className="modal-body p-0">
                {(() => {
                  const b = selectedBooking;
                  const room = rooms.find(r => String(r.id) === String(b.roomId));
                  const rColor = room ? (room.color || 'var(--gold)') : 'var(--navy)';
                  const bInfo = getBookerInfo(b);
                  const fmtDate = new Date(b.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                  
                  return (
                    <>
                      <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${rColor}, #1f4a7a)` }}>
                        <div className="dh-room"><i className="bi bi-door-open-fill"></i> {room ? room.name : 'ไม่พบห้องประชุม'}</div>
                        <div className="dh-meta">{room ? `${room.building} • ${room.floor} • ความจุ ${room.capacity} คน` : ''}</div>
                      </div>

                      <div className="detail-datetime">
                        <div className="dt-block">
                          <div className="dt-icon"><i className="bi bi-calendar-event" style={{ color: rColor }}></i></div>
                          <div className="dt-label">วันที่</div>
                          <div className="dt-value">{fmtDate}</div>
                        </div>
                        <div className="dt-block">
                          <div className="dt-icon"><i className="bi bi-clock" style={{ color: rColor }}></i></div>
                          <div className="dt-label">เวลา</div>
                          <div className="dt-value">{b.timeStart} - {b.timeEnd} น.</div>
                        </div>
                      </div>

                      <div className="detail-body-info">
                        <div className="di-row di-status">
                          <div className="di-label"><i className="bi bi-info-circle"></i> สถานะ</div>
                          <div className="di-value">{getStatusBadge(b.status)}</div>
                        </div>
                        
                        {b.status === 'cancelled' && b.cancelReason && (
                          <div className="di-row text-danger" style={{ backgroundColor: '#fdf2f2', borderRadius: '8px', padding: '10px 14px', marginTop: '6px' }}>
                            <div className="di-label text-danger" style={{ fontWeight: 700 }}><i className="bi bi-exclamation-triangle-fill"></i> เหตุผลการยกเลิก</div>
                            <div className="di-value text-danger" style={{ fontWeight: 700, textAlign: 'left' }}>{b.cancelReason}</div>
                          </div>
                        )}

                        <div className="di-row">
                          <div className="di-label"><i className="bi bi-person"></i> ผู้จอง</div>
                          <div className="di-value">
                            {bInfo.name}
                            {bInfo.isExternal && <span className="badge bg-secondary-subtle text-secondary ms-1">บุคคลภายนอก</span>}
                          </div>
                        </div>
                        <div className="di-row">
                          <div className="di-label"><i className="bi bi-building-gear"></i> สังกัดกลุ่มงาน / ฝ่าย</div>
                          <div className="di-value"><strong>{bInfo.dept || '-'}</strong></div>
                        </div>
                        <div className="di-row">
                          <div className="di-label"><i className="bi bi-telephone"></i> เบอร์โทร</div>
                          <div className="di-value">{b.phone}</div>
                        </div>
                        <div className="di-row">
                          <div className="di-label"><i className="bi bi-card-heading"></i> หัวข้อการประชุม</div>
                          <div className="di-value text-start text-break fw-normal" style={{ maxWidth: '250px' }}>{b.topic}</div>
                        </div>
                        <div className="di-row">
                          <div className="di-label"><i className="bi bi-tools"></i> อุปกรณ์</div>
                          <div className="di-value">{b.equipment ? (Array.isArray(b.equipment) ? b.equipment.join(', ') : b.equipment) : 'ไม่มี'}</div>
                        </div>
                      </div>

                      <div className="di-created">สร้างรายการเมื่อ: {b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : '-'}</div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
