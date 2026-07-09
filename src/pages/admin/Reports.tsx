import { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { DB } from '../../services/db';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Refs for printing/export
  const printAreaRef = useRef<HTMLDivElement>(null);
  const printHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      setBookings(DB.getBookings());
      setRooms(DB.getRooms());
      setUsers(DB.getUsers());
    };
    load();
    window.addEventListener('db-synced', load);
    return () => window.removeEventListener('db-synced', load);
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  const filteredBookings = useMemo(() => {
    let rows = bookings.filter(b => {
      let ok = true;
      if (fromDate) ok = ok && b.date >= fromDate;
      if (toDate) ok = ok && b.date <= toDate;
      if (roomId) ok = ok && b.roomId === parseInt(roomId);
      if (dept) {
        if (dept === 'บุคคลภายนอก') {
          ok = ok && b.isExternal === true;
        } else {
          ok = ok && (!b.isExternal && b.department === dept);
        }
      }
      if (status) ok = ok && b.status === status;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        ok = ok && (
          (b.topic?.toLowerCase().includes(lowerSearch)) ||
          (b.bookerName?.toLowerCase().includes(lowerSearch)) ||
          (getRoomName(b.roomId)?.toLowerCase().includes(lowerSearch))
        );
      }
      return ok;
    });
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings, fromDate, toDate, roomId, dept, status, searchTerm]);

  const stats = useMemo(() => {
    // 1. Most Used Room
    const roomCounts: Record<number, number> = {};
    // 2. Most Active Dept
    const deptCounts: Record<string, number> = {};

    filteredBookings.forEach(b => {
      roomCounts[b.roomId] = (roomCounts[b.roomId] || 0) + 1;
      const dKey = b.isExternal ? 'บุคคลภายนอก' : (b.department || 'ไม่ระบุสังกัด');
      deptCounts[dKey] = (deptCounts[dKey] || 0) + 1;
    });

    let maxRoomId = null;
    let maxRoomCount = 0;
    for (const rid in roomCounts) {
      if (roomCounts[rid] > maxRoomCount) {
        maxRoomCount = roomCounts[rid];
        maxRoomId = parseInt(rid);
      }
    }

    let maxDeptName = null;
    let maxDeptCount = 0;
    for (const dname in deptCounts) {
      if (deptCounts[dname] > maxDeptCount) {
        maxDeptCount = deptCounts[dname];
        maxDeptName = dname;
      }
    }

    const roomObj = rooms.find(r => r.id === maxRoomId);
    return {
      mostUsedRoomText: roomObj ? `${roomObj.name} (${maxRoomCount} ครั้ง)` : 'ไม่มีข้อมูล',
      mostUsedDeptText: maxDeptName ? `${maxDeptName} (${maxDeptCount} ครั้ง)` : 'ไม่มีข้อมูล'
    };
  }, [filteredBookings, rooms]);

  const tableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const handleFromDateChange = (val: string) => {
    if (toDate && val > toDate) {
      alert('วันเริ่มต้นต้องน้อยกว่าหรือเท่ากับวันสิ้นสุด');
      return;
    }
    setFromDate(val);
  };

  const handleToDateChange = (val: string) => {
    if (fromDate && val < fromDate) {
      alert('วันสิ้นสุดต้องมากกว่าหรือเท่ากับวันเริ่มต้น');
      return;
    }
    setToDate(val);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, roomId, dept, status, searchTerm]);

  const getRoomName = (id: number) => {
    const r = rooms.find(r => r.id === id);
    return r ? r.name : 'ไม่ทราบห้อง';
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'pending': return 'รออนุมัติ';
      case 'approved': return 'อนุมัติ';
      case 'cancelled': return 'ยกเลิก';
      default: return s;
    }
  };

  const fmtDate = (dStr: string) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // Export PDF
  const exportPDF = async () => {
    if (filteredBookings.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลสำหรับการ Export', 'info');
      return;
    }
    Swal.fire({
      title: 'กำลังสร้างไฟล์ PDF...',
      text: 'ระบบกำลังประมวลผล กรุณารอสักครู่',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    if (printHeaderRef.current) printHeaderRef.current.classList.remove('d-none');
    
    // Temporarily make the print area visible for html2canvas
    const printWrapper = document.getElementById('print-wrapper');
    if (printWrapper) {
      printWrapper.classList.remove('d-none');
      printWrapper.classList.remove('opacity-0');
      printWrapper.classList.remove('position-absolute');
    }
    
    try {
      if (printAreaRef.current) {
        const canvas = await html2canvas(printAreaRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        if (printHeaderRef.current) printHeaderRef.current.classList.add('d-none');
        if (printWrapper) {
          printWrapper.classList.add('d-none');
          // or restore its hidden state classes
        }
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('รายงานการจองห้องประชุม.pdf');
        Swal.fire({ icon: 'success', title: 'สร้างไฟล์ PDF สำเร็จ', timer: 1200, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
      if (printHeaderRef.current) printHeaderRef.current.classList.add('d-none');
      const printWrapper = document.getElementById('print-wrapper');
      if (printWrapper) printWrapper.classList.add('d-none');
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง PDF ได้', 'error');
    }
  };

  // Export Excel
  const exportExcel = () => {
    if (filteredBookings.length === 0) {
      Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลสำหรับการ Export', 'info');
      return;
    }
    Swal.fire({ title: 'กำลังสร้างไฟล์ Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    setTimeout(() => {
      const data = filteredBookings.map((b, i) => ({
        '#': i + 1,
        'ผู้จอง': b.bookerName,
        'กลุ่มสาระฯ / ฝ่ายงาน / สังกัด': b.department || '-',
        'ประเภท': b.isExternal ? 'ภายนอก' : 'บุคลากรภายใน',
        'เบอร์โทร': b.phone,
        'ห้องประชุม': getRoomName(b.roomId),
        'หัวข้อ': b.topic,
        'วันที่': fmtDate(b.date),
        'เวลา': `${b.timeStart} - ${b.timeEnd}`,
        'สถานะ': getStatusBadge(b.status)
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
      XLSX.writeFile(wb, 'booking-report.xlsx');

      Swal.fire({ icon: 'success', title: 'สร้างไฟล์ Excel สำเร็จ', timer: 1200, showConfirmButton: false });
    }, 500);
  };

  const printReport = () => {
    if (printHeaderRef.current) printHeaderRef.current.classList.remove('d-none');
    window.print();
    setTimeout(() => {
      if (printHeaderRef.current) printHeaderRef.current.classList.add('d-none');
    }, 500);
  };

  return (
    <div className="page-fade">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 d-print-none">
        <h4 className="mb-0 text-navy font-display" style={{ fontWeight: 800 }}>
          <i className="bi bi-file-earmark-bar-graph-fill text-primary me-2"></i> รายงานและส่งออกข้อมูล
        </h4>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-danger rounded-pill px-3 shadow-sm" style={{ fontWeight: 600 }} onClick={exportPDF}>
            <i className="bi bi-file-earmark-pdf"></i> PDF
          </button>
          <button className="btn btn-success rounded-pill px-3 shadow-sm" style={{ fontWeight: 600 }} onClick={exportExcel}>
            <i className="bi bi-file-earmark-excel"></i> Excel
          </button>
          <button className="btn btn-primary rounded-pill px-3 shadow-sm" style={{ fontWeight: 600 }} onClick={printReport}>
            <i className="bi bi-printer"></i> พิมพ์รายงาน
          </button>
        </div>
      </div>
      <div className="modern-filter-container mt-3 d-print-none">
        <div className="filter-tabs-scroll">
          <button className={`filter-btn ${status === '' ? 'active' : ''}`} onClick={() => { setStatus(''); setCurrentPage(1); }}>ทั้งหมด</button>
          <button className={`filter-btn ${status === 'pending' ? 'active' : ''}`} onClick={() => { setStatus('pending'); setCurrentPage(1); }}>รออนุมัติ</button>
          <button className={`filter-btn ${status === 'approved' ? 'active' : ''}`} onClick={() => { setStatus('approved'); setCurrentPage(1); }}>อนุมัติ</button>
          <button className={`filter-btn ${status === 'cancelled' ? 'active' : ''}`} onClick={() => { setStatus('cancelled'); setCurrentPage(1); }}>ยกเลิก</button>
        </div>
        <div className="filter-controls">
          <input className="filter-control-item" placeholder="ค้นหาหัวข้อ/ผู้จอง/ห้อง..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: '150px' }} />
          <input className="filter-control-item" title="จากวันที่" type="date" value={fromDate} max={toDate || undefined} onChange={e => { handleFromDateChange(e.target.value); setCurrentPage(1); }} />
          <input className="filter-control-item" title="ถึงวันที่" type="date" value={toDate} min={fromDate || undefined} onChange={e => { handleToDateChange(e.target.value); setCurrentPage(1); }} />
          <select className="filter-control-item" value={roomId} onChange={e => { setRoomId(e.target.value); setCurrentPage(1); }}>
            <option value="">ทุกห้องประชุม</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="filter-control-item" value={dept} onChange={e => { setDept(e.target.value); setCurrentPage(1); }}>
            <option value="">ทุกกลุ่มงาน / ภายนอก</option>
            {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
            <option value="บุคคลภายนอก">หน่วยงานภายนอก</option>
          </select>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="row g-4 mb-4 d-print-none">
        <div className="col-md-6">
          <div className="p-4 rounded-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <i className="bi bi-trophy position-absolute opacity-25" style={{ fontSize: '80px', right: '-10px', top: '-10px' }}></i>
            <small style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>ห้องประชุมที่ถูกใช้งานมากที่สุด</small>
            <h4 className="font-display fw-bold mb-0 mt-2">{stats.mostUsedRoomText}</h4>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p-4 rounded-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <i className="bi bi-people-fill position-absolute opacity-25" style={{ fontSize: '80px', right: '-10px', top: '-10px' }}></i>
            <small style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>สังกัดที่จองใช้งานมากที่สุด</small>
            <h4 className="font-display fw-bold mb-0 mt-2">{stats.mostUsedDeptText}</h4>
          </div>
        </div>
      </div>

      {/* Mobile-only Booking Cards Gallery */}
      <div className="row g-4 d-md-none d-print-none">
        {tableData.length === 0 ? (
          <div className="col-12 text-center text-muted py-5">
            <i className="bi bi-folder-x fs-1 d-block mb-3 opacity-50"></i>
            ไม่พบข้อมูลการจอง
          </div>
        ) : (
          tableData.map((b) => (
            <div key={b.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <div className={`mobile-card status-${b.status}`}>
                <div className="mobile-card-header">
                  <h6 className="mobile-card-title text-truncate" title={b.topic}>{b.topic}</h6>
                  <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                    {b.status === 'pending' && <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>}
                    {b.status === 'approved' && <span className="badge-status badge-approved" style={{color: 'white', background: 'transparent'}}><i className="bi bi-check-circle"></i> อนุมัติแล้ว</span>}
                    {b.status === 'cancelled' && <span className="badge-status badge-cancelled" style={{color: 'white', background: 'transparent'}}><i className="bi bi-x-circle"></i> ยกเลิก</span>}
                  </span>
                </div>
                <div className="mobile-card-body">
                  <p className="mb-2"><i className="bi bi-person"></i> <strong>{b.bookerName}</strong> {b.isExternal && <span className="badge bg-secondary ms-1">ภายนอก</span>}</p>
                  <p className="mb-2"><i className="bi bi-tag-fill"></i> {b.department || 'ไม่ระบุสังกัด'}</p>
                  <p className="mb-2"><i className="bi bi-geo-alt"></i> <strong>{getRoomName(b.roomId)}</strong></p>
                  <p className="mb-2"><i className="bi bi-calendar-event"></i> {fmtDate(b.date)}</p>
                  <p className="mb-2"><i className="bi bi-clock"></i> {b.timeStart} - {b.timeEnd}</p>
                  <p className="mb-0"><i className="bi bi-tv"></i> อุปกรณ์: {b.equipment ? (Array.isArray(b.equipment) ? b.equipment.join(', ') : b.equipment) : 'ไม่มี'}</p>
                </div>
                {/* Reports page doesn't need actions */}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-5 d-print-none">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <a className="page-link border-0 shadow-sm rounded-start-pill" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}>
                <i className="bi bi-chevron-left"></i>
              </a>
            </li>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <a 
                  className="page-link border-0 shadow-sm mx-1" 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                  style={{ borderRadius: '8px' }}
                >
                  {page}
                </a>
              </li>
            ))}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <a className="page-link border-0 shadow-sm rounded-end-pill mx-1" href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}>
                <i className="bi bi-chevron-right"></i>
              </a>
            </li>
          </ul>
        </nav>
      )}

      {/* Desktop Table View & Printable Area */}
      <div id="print-wrapper" className="d-none d-md-block d-print-block mt-4">
        <div ref={printAreaRef} id="reportPrintArea" style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div ref={printHeaderRef} className="report-header text-center mb-3 d-none" id="reportHeaderPrint">
            <h5>รายงานการจองห้องประชุม</h5>
            <p>โรงเรียนสกลราชวิทยานุกูล</p>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle mb-0" id="rpTable">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>ผู้จอง / สังกัดกลุ่มงาน</th>
                  <th>เบอร์โทร</th>
                  <th>ห้อง</th>
                  <th>หัวข้อ</th>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-4">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  tableData.map((b, i) => (
                    <tr key={b.id}>
                      <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                      <td>
                        <div className="fw-bold">{b.bookerName} {b.isExternal && <span className="badge bg-secondary ms-1">ภายนอก</span>}</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>{b.department || '-'}</div>
                      </td>
                      <td>{b.phone || '-'}</td>
                      <td className="fw-bold">{getRoomName(b.roomId)}</td>
                      <td>{b.topic}</td>
                      <td>{fmtDate(b.date)}</td>
                      <td>{b.timeStart} - {b.timeEnd}</td>
                      <td>
                        <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                          {getStatusBadge(b.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
