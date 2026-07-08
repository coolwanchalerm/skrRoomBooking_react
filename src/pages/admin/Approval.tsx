import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { DB } from '../../services/db';

export default function Approval() {
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [bookings, setBookings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => {
      window.removeEventListener('db-synced', loadData);
    };
  }, []);

  const loadData = () => {
    const allBookings = DB.getBookings();
    allBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setBookings(allBookings);
    setUsers(DB.getUsers());
    setRooms(DB.getRooms());
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

  const getFilteredBookings = () => {
    return bookings.filter(b => {
      if (filterStatus && b.status !== filterStatus) return false;
      if (filterDate && b.date !== filterDate) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
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

  const handlePageChange = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleView = (b: any) => {
    setSelectedBooking(b);
  };

  const closeViewModal = () => {
    setSelectedBooking(null);
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await DB.updateBooking(id, { status: 'approved' });
      loadData();
      closeViewModal();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = (id: number) => {
    Swal.fire({
      title: 'ระบุเหตุผลการยกเลิก',
      text: 'กรุณากรอกเหตุผลในการปฏิเสธคำขอหรือยกเลิกการจองห้องประชุมนี้',
      input: 'textarea',
      inputPlaceholder: 'พิมพ์เหตุผล เช่น ติดภารกิจด่วนโรงเรียน, ห้องประชุมงดให้บริการชั่วคราว...',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการยกเลิก',
      cancelButtonText: 'ปิด',
      confirmButtonColor: '#c1493e',
      preConfirm: (reason) => {
        if (!reason || reason.trim() === '') {
          Swal.showValidationMessage('จำเป็นต้องกรอกเหตุผลในการยกเลิกคำขอจอง');
        }
        return reason;
      }
    }).then(async (result) => {
      if(result.isConfirmed){
        setRejectingId(id);
        const cancelReason = result.value.trim();
        try {
          await DB.updateBooking(id, { status: 'cancelled', cancelReason: cancelReason });
          loadData();
          closeViewModal();
        } catch (err: any) {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
        } finally {
          setRejectingId(null);
        }
      }
    });
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: 'ลบรายการจอง?',
      text: 'คุณต้องการลบรายการจองนี้ออกจากระบบอย่างถาวรใช่หรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        DB.deleteBooking(id).then(() => {
          Swal.fire('ลบสำเร็จ', 'ข้อมูลถูกลบเรียบร้อยแล้ว', 'success');
          loadData();
        });
      }
    });
  };

  return (
    <div className="page-fade">
      <div className="panel">
        <div className="panel-head flex-wrap gap-2">
          <h6><i className="bi bi-clipboard-check"></i> ตรวจสอบและอนุมัติการจอง</h6>
          <div className="d-flex flex-wrap gap-2">
            <input 
              type="text" 
              className="form-control form-control-sm" 
              id="ap_search" 
              placeholder="ค้นหา..." 
              style={{ width: '180px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="form-select form-select-sm" 
              id="ap_filter_status" 
              style={{ width: '150px' }}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            >
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติ</option>
              <option value="cancelled">ยกเลิก</option>
              <option value="">ทุกสถานะ</option>
            </select>
            <input 
              type="date" 
              className="form-control form-control-sm" 
              id="ap_filter_date" 
              style={{ width: '150px' }}
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
        <div className="panel-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" id="apTable">
              <thead>
                <tr>
                  <th className="ps-3">#</th>
                  <th>ผู้จอง / สังกัดฝ่าย</th>
                  <th>ห้อง</th>
                  <th>หัวข้อ</th>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>สถานะ</th>
                  <th className="text-end pe-3">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-5 text-muted border-0">
                      <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                      ไม่พบรายการจองที่ตรงกับเงื่อนไข
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
                        <td>{getStatusBadge(b.status)}</td>
                        <td className="text-end text-nowrap pe-3">
                          <button className="btn btn-success btn-sm text-white d-inline-flex align-items-center gap-1 me-1" onClick={() => handleView(b)}>
                            <i className="bi bi-eye"></i> ดูรายละเอียด
                          </button>
                          <button className="btn-action act-cancel" title="ลบรายการจอง" onClick={() => handleDelete(b.id)}><i className="bi bi-trash"></i></button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div id="apPagination" className="px-3 py-2 border-top">
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

                      <div className="di-created mb-3">สร้างรายการเมื่อ: {b.createdAt ? new Date(b.createdAt).toLocaleString('th-TH') : '-'}</div>

                      {b.status === 'pending' && (
                        <div className="d-flex gap-2 p-3 bg-light border-top justify-content-end" style={{ borderRadius: '0 0 8px 8px' }}>
                          <button 
                            className="btn btn-danger text-white d-flex align-items-center gap-1" 
                            onClick={() => handleReject(b.id)}
                            disabled={rejectingId === b.id || approvingId === b.id}
                          >
                            {rejectingId === b.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-x-circle"></i>
                            )} ปฏิเสธการจอง
                          </button>
                          <button 
                            className="btn btn-success text-white d-flex align-items-center gap-1" 
                            onClick={() => handleApprove(b.id)}
                            disabled={approvingId === b.id || rejectingId === b.id}
                          >
                            {approvingId === b.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-check-circle"></i>
                            )} อนุมัติการจอง
                          </button>
                        </div>
                      )}
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
