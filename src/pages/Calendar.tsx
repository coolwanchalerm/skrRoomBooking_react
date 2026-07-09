import { useState, useEffect } from 'react';
import { DB } from '../services/db';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const loadData = () => {
    setRooms(DB.getRooms());
    setBookings(DB.getBookings());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => {
      window.removeEventListener('db-synced', loadData);
    };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 to 11
  
  // To get days in a given month correctly:
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getBookingsForDate = (dateObj: Date) => {
    // We need to format the date in YYYY-MM-DD local timezone
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const isoDate = (new Date(dateObj.getTime() - tzOffset)).toISOString().split('T')[0];
    return bookings.filter(b => b.date === isoDate && b.status !== 'cancelled');
  };

  const getRoom = (roomId: number) => {
    return rooms.find(r => String(r.id) === String(roomId));
  };

  // State for Booking Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Generate calendar grid
  const renderCalendarGrid = () => {
    const grid = [];
    let dayCount = 1;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          grid.push(<div key={`empty-${j}`} className="cal-cell cal-empty"></div>);
        } else if (dayCount > daysInMonth) {
          grid.push(<div key={`empty-end-${i}-${j}`} className="cal-cell cal-empty"></div>);
        } else {
          const day = dayCount;
          const date = new Date(year, month, day);
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          
          const dayBookings = getBookingsForDate(date);
          
          grid.push(
            <div 
              key={`day-${day}`} 
              className={`cal-cell ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="cal-date-num">{day}</div>
              
              {dayBookings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', marginTop: '4px', overflow: 'hidden' }}>
                  {dayBookings.slice(0, 2).map((b, idx) => {
                    const room = getRoom(b.roomId);
                    const color = room ? (room.color || 'var(--navy)') : 'var(--navy)';
                    return (
                      <div 
                        key={idx} 
                        className="cal-event-pill"
                        title={`${b.topic} (${b.timeStart}-${b.timeEnd}) - ${b.bookerName} [${room?.name}]`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(b);
                        }}
                      >
                        <span className="cal-dot" style={{ backgroundColor: color, flexShrink: 0, marginRight: '4px' }}></span>
                        <span>{b.timeStart}</span>
                      </div>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <div style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 'bold', textAlign: 'right', marginTop: '1px' }}>
                      +{dayBookings.length - 2} รายการ
                    </div>
                  )}
                </div>
              )}
            </div>
          );
          dayCount++;
        }
      }
    }
    return grid;
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  return (
    <div className="page-fade">
      <div className="panel">
        <div className="panel-head justify-content-center py-2">
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={handlePrevMonth}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <div className="cal-month-label">{monthNames[month]} {year + 543}</div>
            <button className="btn btn-sm btn-outline-secondary" onClick={handleNextMonth}>
              <i className="bi bi-chevron-right"></i>
            </button>
            <button className="btn btn-sm btn-primary-soft ms-2" onClick={handleToday}>วันนี้</button>
          </div>
        </div>
        <div className="panel-body">
          <div className="cal-legend mb-3">
            {rooms.filter(r => r.status !== 'maintenance').map(r => (
              <div className="cal-legend-item" key={r.id}>
                <span className="cal-dot" style={{ background: r.color }}></span> {r.name}
              </div>
            ))}
          </div>
          <div className="cal-grid">
            {daysOfWeek.map(d => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {renderCalendarGrid()}
          </div>
          <div className="text-center mt-3 text-muted" style={{ fontSize: '12px' }}>
            <i className="bi bi-hand-index-thumb"></i> แตะที่วันที่หรือเวลาเพื่อดูรายละเอียดการจองด้านล่าง
          </div>
        </div>
      </div>

      <div className="panel mt-3">
        <div className="panel-head">
          <h6>
            <i className="bi bi-list-ul"></i> รายการจองวันที่เลือก: 
            <span className="text-muted ms-2">
              {selectedDate ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}` : '-'}
            </span>
          </h6>
        </div>
        <div className="panel-body p-0">
          
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ห้อง</th>
                  <th>หัวข้อ / สังกัดกลุ่มงาน</th>
                  <th>ผู้จอง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {selectedDateBookings.length > 0 ? (
                  selectedDateBookings.sort((a,b) => a.timeStart.localeCompare(b.timeStart)).map(b => (
                    <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedBooking(b)}>
                      <td>{b.timeStart} - {b.timeEnd}</td>
                      <td>{getRoom(b.roomId)?.name}</td>
                      <td>
                        <div className="font-weight-bold">{b.topic}</div>
                        <div className="text-muted" style={{fontSize: '12px'}}>{b.department}</div>
                      </td>
                      <td>{b.bookerName}</td>
                      <td>
                        {b.status === 'approved' ? (
                          <span className="badge-status badge-approved"><i className="bi bi-check-circle"></i> อนุมัติ</span>
                        ) : (
                          <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted border-0">
                      <i className="bi bi-calendar-x fs-4 d-block mb-2"></i>
                      ไม่มีรายการจองในวันที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS FOR SELECTED DATE */}
          <div className="d-block d-md-none p-3 bg-light">
            {selectedDateBookings.length > 0 ? (
              selectedDateBookings.sort((a,b) => a.timeStart.localeCompare(b.timeStart)).map(b => {
                const room = getRoom(b.roomId);
                return (
                  <div key={b.id} className={`mobile-card status-${b.status}`} onClick={() => setSelectedBooking(b)} style={{ cursor: 'pointer' }}>
                    <div className="mobile-card-header">
                      <h6 className="mobile-card-title">{b.topic}</h6>
                      <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                        {b.status === 'approved' ? 'อนุมัติ' : b.status === 'pending' ? 'รออนุมัติ' : 'ยกเลิก'}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p className="mb-2"><i className="bi bi-person"></i> <strong>{b.bookerName}</strong></p>
                      <p className="mb-2"><i className="bi bi-tag-fill"></i> {b.department}</p>
                      <p className="mb-2"><i className="bi bi-geo-alt"></i> <strong>{room?.name}</strong></p>
                      <p className="mb-0"><i className="bi bi-clock"></i> {b.timeStart} - {b.timeEnd}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-5 text-muted border-0">
                <i className="bi bi-calendar-x fs-1 d-block mb-2 opacity-50"></i>
                <p className="mb-0">ไม่มีรายการจองในวันที่เลือก</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} aria-modal="true" role="dialog" onClick={(e) => { if (e.target === e.currentTarget) setSelectedBooking(null); }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title font-display fw-bold text-navy"><i className="bi bi-card-text"></i> รายละเอียดการจอง</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedBooking(null)}></button>
              </div>
              <div className="modal-body p-0">
                {(() => {
                  const room = getRoom(selectedBooking.roomId);
                  const dDate = new Date(selectedBooking.date);
                  const color = room?.color || 'var(--navy)';
                  
                  return (
                    <>
                      <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${color}, #1f4a7a)`, padding: '24px', color: 'white', textAlign: 'center' }}>
                        <div className="dh-room" style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                          <i className="bi bi-door-open-fill"></i> {room?.name || 'ไม่ทราบห้อง'}
                        </div>
                        <div className="dh-meta" style={{ fontSize: '13px', opacity: 0.9 }}>
                          {room?.building} • {room?.floor} • ความจุ {room?.capacity} คน
                        </div>
                      </div>

                      <div className="detail-datetime" style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                        <div className="dt-block" style={{ flex: 1, padding: '16px', textAlign: 'center', borderRight: '1px solid #eee' }}>
                          <div className="dt-icon"><i className="bi bi-calendar-event" style={{ color: color, fontSize: '24px' }}></i></div>
                          <div className="dt-label" style={{ fontSize: '12px', color: 'var(--muted)' }}>วันที่</div>
                          <div className="dt-value" style={{ fontWeight: 600 }}>
                            {dDate.getDate()} {monthNames[dDate.getMonth()]} {dDate.getFullYear() + 543}
                          </div>
                        </div>
                        <div className="dt-block" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
                          <div className="dt-icon"><i className="bi bi-clock" style={{ color: color, fontSize: '24px' }}></i></div>
                          <div className="dt-label" style={{ fontSize: '12px', color: 'var(--muted)' }}>เวลา</div>
                          <div className="dt-value" style={{ fontWeight: 600 }}>
                            {selectedBooking.timeStart} - {selectedBooking.timeEnd}
                          </div>
                        </div>
                      </div>

                      <div className="detail-body-info" style={{ padding: '24px' }}>
                        <div className="di-row di-status d-flex justify-content-between align-items-center mb-3">
                          <div className="di-label text-muted"><i className="bi bi-info-circle"></i> สถานะ</div>
                          <div className="di-value">
                            {selectedBooking.status === 'pending' && <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>}
                            {selectedBooking.status === 'approved' && <span className="badge-status badge-approved"><i className="bi bi-check-circle-fill"></i> อนุมัติ</span>}
                            {selectedBooking.status === 'cancelled' && <span className="badge-status badge-cancelled"><i className="bi bi-x-circle-fill"></i> ยกเลิก</span>}
                          </div>
                        </div>
                        
                        <div className="di-row d-flex justify-content-between align-items-start mb-2">
                          <div className="di-label text-muted"><i className="bi bi-person"></i> ผู้จอง</div>
                          <div className="di-value text-end">{selectedBooking.bookerName}</div>
                        </div>
                        <div className="di-row d-flex justify-content-between align-items-start mb-2">
                          <div className="di-label text-muted"><i className="bi bi-building-gear"></i> สังกัดกลุ่มงาน / ฝ่าย</div>
                          <div className="di-value text-end"><strong>{selectedBooking.department}</strong></div>
                        </div>
                        <div className="di-row d-flex justify-content-between align-items-start mb-2">
                          <div className="di-label text-muted"><i className="bi bi-telephone"></i> เบอร์โทร</div>
                          <div className="di-value text-end">{selectedBooking.phone || '-'}</div>
                        </div>
                        <div className="di-row d-flex justify-content-between align-items-start mb-2">
                          <div className="di-label text-muted"><i className="bi bi-card-heading"></i> หัวข้อการประชุม</div>
                          <div className="di-value text-end text-break fw-normal" style={{ maxWidth: '250px' }}>{selectedBooking.topic}</div>
                        </div>
                        <div className="di-row d-flex justify-content-between align-items-start mb-2">
                          <div className="di-label text-muted"><i className="bi bi-tools"></i> อุปกรณ์</div>
                          <div className="di-value text-end">{selectedBooking.equipment || '-'}</div>
                        </div>
                      </div>

                      <div className="di-created bg-light text-center py-2 text-muted" style={{ fontSize: '12px' }}>
                        สร้างรายการเมื่อ: {new Date(selectedBooking.createdAt).toLocaleString('th-TH')}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedBooking(null)}>ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
