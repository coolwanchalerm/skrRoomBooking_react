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
      return ok;
    });
    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings, fromDate, toDate, roomId, dept, status]);

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
  }, [fromDate, toDate, roomId, dept, status]);

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
    
    try {
      if (printAreaRef.current) {
        const canvas = await html2canvas(printAreaRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        if (printHeaderRef.current) printHeaderRef.current.classList.add('d-none');
        
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
      <div className="panel">
        <div className="panel-head flex-wrap gap-2 d-print-none">
          <h6><i className="bi bi-file-earmark-bar-graph"></i> รายงานและส่งออกข้อมูล</h6>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-export-pdf" onClick={exportPDF}><i className="bi bi-file-earmark-pdf"></i> Export PDF</button>
            <button className="btn btn-sm btn-export-excel" onClick={exportExcel}><i className="bi bi-file-earmark-excel"></i> Export Excel</button>
            <button className="btn btn-sm btn-export-print" onClick={printReport}><i className="bi bi-printer"></i> พิมพ์รายงาน</button>
          </div>
        </div>
        <div className="panel-body">
          {/* Filters */}
          <div className="row g-2 mb-3 d-print-none">
            <div className="col-md-2">
              <label className="form-label form-label-sm">จากวันที่</label>
              <input type="date" className="form-control form-control-sm" value={fromDate} max={toDate || undefined} onChange={e => handleFromDateChange(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label form-label-sm">ถึงวันที่</label>
              <input type="date" className="form-control form-control-sm" value={toDate} min={fromDate || undefined} onChange={e => handleToDateChange(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label form-label-sm">ห้องประชุม</label>
              <select className="form-select form-select-sm" value={roomId} onChange={e => setRoomId(e.target.value)}>
                <option value="">ทุกห้อง</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label form-label-sm">กลุ่มสาระฯ / ฝ่ายงาน</label>
              <select className="form-select form-select-sm" value={dept} onChange={e => setDept(e.target.value)}>
                <option value="">ทุกกลุ่มงาน / บุคคลภายนอก</option>
                {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                <option value="บุคคลภายนอก">หน่วยงานภายนอก</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label form-label-sm">สถานะ</label>
              <select className="form-select form-select-sm" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">ทุกสถานะ</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติ</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="p-3 mb-3 rounded" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>
            <div className="row text-center g-2">
              <div className="col-md-6 border-end border-md-0">
                <small className="text-muted" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  <i className="bi bi-trophy"></i> ห้องประชุมที่ใช้งานบ่อยที่สุด
                </small>
                <h5 className="text-navy font-display mb-0 mt-1" style={{ fontWeight: 700, fontSize: '14.5px' }}>
                  {stats.mostUsedRoomText}
                </h5>
              </div>
              <div className="col-md-6">
                <small className="text-muted" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  <i className="bi bi-people-fill"></i> สังกัดที่ใช้งานบ่อยที่สุด
                </small>
                <h5 className="text-navy font-display mb-0 mt-1" style={{ fontWeight: 700, fontSize: '14.5px' }}>
                  {stats.mostUsedDeptText}
                </h5>
              </div>
            </div>
          </div>

          {/* Printable Area */}
          <div ref={printAreaRef} id="reportPrintArea" style={{ background: '#ffffff', padding: '10px', borderRadius: '8px' }}>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-end mt-3 d-print-none">
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>ก่อนหน้า</button>
                  </li>
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>ถัดไป</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
