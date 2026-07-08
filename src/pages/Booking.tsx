import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DB, todayISO } from '../services/db';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Booking() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editBookingId = location.state?.editBookingId;
  
  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('12');
  const [endMin, setEndMin] = useState('00');
  const [room, setRoom] = useState('');
  
  const [bookerName, setBookerName] = useState(user?.fullname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [topic, setTopic] = useState('');
  const [equipment, setEquipment] = useState('');

  const [bookerType, setBookerType] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [targetHasPending, setTargetHasPending] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Format phone number helper
  const formatPhone = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.length > 10) digits = digits.slice(0, 10);
    if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return digits;
  };
  
  const isValidPhone = (val: string) => /^\d{3}-\d{3}-\d{4}$/.test(val);

  // Generate hours 00-23 and minutes
  const allHours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const getTodayISO = () => {
    return todayISO(0);
  };

  const getAvailableStartHours = () => {
    if (date === getTodayISO()) {
      const currentHour = new Date().getHours();
      return allHours.filter(h => parseInt(h) >= currentHour);
    }
    return allHours;
  };

  const getAvailableEndHours = () => {
    const minHour = parseInt(startHour);
    if (date === getTodayISO()) {
      const currentHour = new Date().getHours();
      return allHours.filter(h => parseInt(h) >= Math.max(minHour, currentHour));
    }
    return allHours.filter(h => parseInt(h) >= minHour);
  };

  // Sync hours if they are now invalid (e.g. when changing date to today)
  useEffect(() => {
    if (date === getTodayISO()) {
      const currentHour = new Date().getHours();
      const currentStart = parseInt(startHour);
      if (currentStart < currentHour) {
        setStartHour(currentHour.toString().padStart(2, '0'));
      }
      
      const currentEnd = parseInt(endHour);
      const minEnd = Math.max(currentStart < currentHour ? currentHour : currentStart, currentHour);
      if (currentEnd < minEnd) {
        setEndHour(minEnd.toString().padStart(2, '0'));
      }
    } else {
      const currentStart = parseInt(startHour);
      const currentEnd = parseInt(endHour);
      if (currentEnd < currentStart) {
        setEndHour(startHour);
      }
    }
  }, [date, startHour, endHour]);

  useEffect(() => {
    // Load rooms from DB
    const allRooms = DB.getRooms();
    setRooms(allRooms);
    
    // Load all users for admin dropdown
    let usersList: any[] = [];
    if (user && (user.role === 'admin' || user.role === 'superadmin')) {
      const users = DB.getUsers();
      usersList = users.filter((u: any) => u.role !== 'admin' && u.role !== 'superadmin');
      setAllUsers(usersList);
    }

    if (editBookingId) {
      const b = DB.getBookings().find((x: any) => x.id === editBookingId);
      if (b) {
        setDate(b.date);
        if (b.timeStart) {
          const [h, m] = b.timeStart.split(':');
          setStartHour(h);
          setStartMin(m);
        }
        if (b.timeEnd) {
          const [h, m] = b.timeEnd.split(':');
          setEndHour(h);
          setEndMin(m);
        }
        setRoom(String(b.roomId));
        setTopic(b.topic);
        setEquipment(Array.isArray(b.equipment) ? b.equipment.join(', ') : b.equipment || '');
        
        let p = String(b.phone || '');
        if (p && !p.startsWith('0')) p = '0' + p;
        setPhone(formatPhone(p));
        setDepartment(b.department || '');
        setBookerName(b.bookerName || '');

        if (isAdmin) {
          if (b.isExternal) {
            setBookerType('external');
          } else {
            setBookerType('teacher');
            setSelectedTeacherId(String(b.userId || ''));
          }
        }
      }
    } else {
      // Create mode
      if (user && DB.hasPendingBooking(user.id) && user.role !== 'admin' && user.role !== 'superadmin') {
        setHasPending(true);
      }
      
      if (user && !isAdmin) {
        // Pre-fill for regular user
        setBookerName(user.fullname || user.name || '');
        
        let p = String(user.phone || '');
        if (p && !p.startsWith('0')) p = '0' + p;
        setPhone(formatPhone(p));
        
        setDepartment(user.department || '');
      }
    }
  }, [user, editBookingId, isAdmin]);

  // Handle booker type change for admins (only if NOT in edit mode, or if they change it)
  useEffect(() => {
    if (!isAdmin || editBookingId) return;
    if (bookerType === 'teacher') {
      setSelectedTeacherId('');
      setBookerName('');
      setPhone('');
      setDepartment('');
    } else if (bookerType === 'external') {
      setSelectedTeacherId('');
      setBookerName('');
      setPhone('');
      setDepartment('');
    } else {
      setSelectedTeacherId('');
      setBookerName('');
      setPhone('');
      setDepartment('');
    }
  }, [bookerType, isAdmin, editBookingId]);

  // Handle teacher selection for admins (only if NOT in edit mode initially, but we want it to react if they change selection)
  useEffect(() => {
    if (!isAdmin || bookerType !== 'teacher') return;
    
    // If edit mode and selectedTeacherId matches the booking's userId, don't overwrite with default teacher phone
    // Actually, it's fine to overwrite, because if they change it we want it to update.
    if (selectedTeacherId) {
      const teacher = allUsers.find(u => String(u.id) === selectedTeacherId);
      if (teacher) {
        setBookerName(teacher.fullname || teacher.name || '');
        let p = String(teacher.phone || '');
        if (p && !p.startsWith('0')) p = '0' + p;
        setPhone(formatPhone(p));
        setDepartment(teacher.department || '');
      }
    } else {
      setBookerName('');
      setPhone('');
      setDepartment('');
    }
  }, [selectedTeacherId, allUsers, isAdmin, bookerType]);

  // Check pending status dynamically for the target user (Admin)
  useEffect(() => {
    if (!isAdmin) return;
    const bookings = DB.getBookings();
    
    let isPending = false;
    if (bookerType === 'teacher' && selectedTeacherId) {
      isPending = bookings.some(b => b.id !== editBookingId && b.userId === parseInt(selectedTeacherId) && b.status === 'pending');
    } else if (bookerType === 'external' && bookerName && phone) {
      isPending = bookings.some(b => b.id !== editBookingId && b.isExternal && b.bookerName === bookerName && b.phone === phone && b.status === 'pending');
    }
    
    setTargetHasPending(isPending);
  }, [isAdmin, bookerType, selectedTeacherId, bookerName, phone, editBookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate time
    const startTime = parseInt(startHour) * 60 + parseInt(startMin);
    const endTime = parseInt(endHour) * 60 + parseInt(endMin);
    
    if (startTime >= endTime) {
      Swal.fire({
        icon: 'error',
        title: 'เวลาไม่ถูกต้อง',
        text: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น',
        confirmButtonColor: '#0e2a4a',
      });
      setLoading(false);
      return;
    }

    if (!isValidPhone(phone)) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบเบอร์โทรไม่ถูกต้อง',
        text: 'กรุณากรอกเบอร์โทรศัพท์ในรูปแบบ 0XX-XXX-XXXX เช่น 081-234-5678',
        confirmButtonColor: '#0e2a4a',
      });
      setLoading(false);
      return;
    }

    // ตรวจสอบว่าไม่ใช่เวลาย้อนหลังของวันนี้
    if (date === getTodayISO()) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTime = currentHour * 60 + currentMin;

      if (startTime < currentTime) {
        Swal.fire({
          icon: 'error',
          title: 'เวลาไม่ถูกต้อง',
          text: 'ไม่สามารถจองเวลาที่ผ่านมาแล้วได้',
          confirmButtonColor: '#0e2a4a',
        });
        setLoading(false);
        return;
      }
    }

    if (!room) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกห้องประชุม',
        text: 'โปรดเลือกห้องประชุมที่ว่างในส่วนที่ 2',
        confirmButtonColor: '#0e2a4a',
      });
      setLoading(false);
      return;
    }

    // Check room conflicts
    if (DB.hasConflict(parseInt(room), date, `${startHour}:${startMin}`, `${endHour}:${endMin}`, editBookingId)) {
      Swal.fire({
        icon: 'error',
        title: 'ห้องประชุมถูกจองแล้ว',
        text: 'ห้องประชุมนี้มีการจองในวันและเวลาดังกล่าวแล้ว กรุณาเลือกเวลาหรือห้องอื่น',
        confirmButtonColor: '#0e2a4a',
      });
      setLoading(false);
      return;
    }

    // Determine target user logic
    const isExternal = isAdmin && bookerType === 'external';
    let bookingUserId = user?.id;
    if (isAdmin && bookerType === 'teacher' && selectedTeacherId) {
      bookingUserId = parseInt(selectedTeacherId);
    } else if (isAdmin && bookerType === 'external') {
      bookingUserId = undefined; 
    }
    
    // Validate if the target person already has a pending booking (ignoring the current edit booking)
    const bookings = DB.getBookings();
    const hasPendingForTarget = bookings.some(b => 
      b.id !== editBookingId && b.status === 'pending' && 
      (
        (bookingUserId && b.userId === bookingUserId) || 
        (!bookingUserId && b.isExternal && b.bookerName === bookerName && b.phone === phone)
      )
    );

    if (hasPendingForTarget) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถจองได้',
        text: 'บุคคลนี้มีรายการจองที่รออนุมัติอยู่แล้ว กรุณารอการอนุมัติรายการเดิมก่อนทำการจองใหม่',
        confirmButtonColor: '#0e2a4a',
      });
      setLoading(false);
      return;
    }

    // Submit to DB
    const newBooking = {
      userId: bookingUserId,
      isExternal,
      bookerName,
      phone,
      department,
      roomId: parseInt(room),
      topic,
      date,
      timeStart: `${startHour}:${startMin}`,
      timeEnd: `${endHour}:${endMin}`,
      equipment
    };

    try {
      if (editBookingId) {
        await DB.updateBooking(editBookingId, newBooking);
        Swal.fire({
          icon: 'success',
          title: 'แก้ไขสำเร็จ',
          text: 'ข้อมูลการจองของคุณถูกอัปเดตเรียบร้อยแล้ว',
          confirmButtonColor: '#13a446',
        }).then(() => {
          navigate('/my-bookings');
        });
      } else {
        await DB.addBooking(newBooking);
        Swal.fire({
          icon: 'success',
          title: 'จองห้องประชุมสำเร็จ',
          text: 'ส่งคำขอจองห้องประชุมของคุณเรียบร้อยแล้ว กรุณารอการอนุมัติ',
          confirmButtonColor: '#13a446',
        }).then(() => {
          // Reset form
          setDate('');
          setRoom('');
          setTopic('');
          setEquipment('');
          if (isAdmin) {
            setBookerType('');
            setSelectedTeacherId('');
            setBookerName('');
            setPhone('');
            setDepartment('');
          }
          
          // Only set hasPending for the current user if they booked for themselves
          if (!isAdmin || bookingUserId === user?.id) {
            setHasPending(true); 
          }
          navigate('/my-bookings');
        });
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#0e2a4a',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRoomCards = () => {
    return rooms.map(r => {
      const isMaintenance = r.status === 'maintenance';
      
      // If date/time not selected yet
      if (!date || !startHour || !endHour) {
        const cardStyle = isMaintenance 
          ? { borderLeft: '5px solid #999', opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#f5f5f5' }
          : { borderLeft: `5px solid ${r.color || 'var(--gold)'}` };
          
        return (
          <div className="col-md-6 col-lg-3" key={r.id}>
            <div className="room-card" style={cardStyle}>
              <div className="room-card-icon" style={{ backgroundColor: `${r.color}22`, color: r.color }}>
                <i className="bi bi-door-open-fill"></i>
              </div>
              {isMaintenance && <span className="badge bg-warning text-dark mb-2"><i className="bi bi-tools"></i> ปิดปรับปรุง</span>}
              <h6>{r.name}</h6>
              <div className="meta"><i className="bi bi-building"></i> {r.building ? `${r.building} • ${r.floor}` : (r.floor || "ไม่ระบุอาคาร")}</div>
              <div className="meta"><i className="bi bi-people"></i> ความจุ {r.capacity} คน</div>
              
              <div className="mt-2 text-muted text-center py-2 rounded" style={{ fontSize: '11.5px', background: '#f0ede6' }}>
                {isMaintenance ? (
                  <><i className="bi bi-cone-striped"></i> ห้องนี้ไม่สามารถจองได้ในขณะนี้</>
                ) : (
                  <><i className="bi bi-clock"></i> ระบุวัน-เวลาก่อนเพื่อเช็คห้องว่าง</>
                )}
              </div>
            </div>
          </div>
        );
      }

      // If date/time selected
      const tStart = `${startHour}:${startMin}`;
      const tEnd = `${endHour}:${endMin}`;
      
      const startTime = parseInt(startHour) * 60 + parseInt(startMin);
      const endTime = parseInt(endHour) * 60 + parseInt(endMin);
      
      const isTimeInvalid = startTime >= endTime;
      const isConflicted = !isMaintenance && !isTimeInvalid && DB.hasConflict(r.id, date, tStart, tEnd);
      
      const isSelected = room === String(r.id);
      
      let badgeHtml = null;
      let cardStyle: any = { borderLeft: `5px solid ${r.color || 'var(--gold)'}` };
      let clickHandler = undefined;
      let extraConflictInfo = null;

      if (isMaintenance) {
        badgeHtml = <span className="badge bg-warning text-dark mb-2"><i className="bi bi-tools"></i> ปิดปรับปรุง — ไม่สามารถจองได้</span>;
        cardStyle = { ...cardStyle, opacity: 0.55, cursor: 'not-allowed', backgroundColor: '#f5f5f5', borderLeftColor: '#aaa' };
      } else if (isTimeInvalid) {
        badgeHtml = <span className="badge bg-secondary-subtle text-secondary mb-2"><i className="bi bi-exclamation-circle-fill"></i> เวลาไม่ถูกต้อง</span>;
        cardStyle = { ...cardStyle, opacity: 0.65, cursor: 'not-allowed', backgroundColor: '#fafafa' };
      } else if (isConflicted) {
        badgeHtml = <span className="badge bg-danger-subtle text-danger mb-2"><i className="bi bi-x-circle-fill"></i> ไม่ว่างในช่วงเวลานี้</span>;
        cardStyle = { ...cardStyle, opacity: 0.65, cursor: 'not-allowed', backgroundColor: '#fafafa' };
        
        const activeBooking = DB.getBookings().find(b =>
          b.roomId === r.id &&
          b.date === date &&
          b.status !== 'cancelled' &&
          (tStart < b.timeEnd && tEnd > b.timeStart)
        );
        
        if (activeBooking) {
          extraConflictInfo = (
            <div className="mt-2 p-2 bg-light rounded text-start" style={{ fontSize: '11px', borderLeft: '2px solid var(--red)' }}>
              <strong>ผู้จอง:</strong> {activeBooking.bookerName}<br/>
              <strong>ฝ่าย/กลุ่มสาระ:</strong> {activeBooking.department || '-'}<br/>
              <strong>ช่วงเวลา:</strong> {activeBooking.timeStart} - {activeBooking.timeEnd}<br/>
              <strong>หัวข้อ:</strong> {activeBooking.topic}
            </div>
          );
        }
      } else {
        badgeHtml = <span className="badge bg-success-subtle text-success mb-2"><i className="bi bi-check-circle-fill"></i> ว่าง (คลิกเลือกห้องนี้)</span>;
        cardStyle.cursor = 'pointer';
        if (isSelected) {
          cardStyle.borderColor = 'var(--gold)';
          cardStyle.backgroundColor = 'var(--gold-soft)';
          cardStyle.boxShadow = '0 4px 12px rgba(217,164,64,0.25)';
        }
        clickHandler = () => setRoom(String(r.id));
      }

      return (
        <div className="col-md-6 col-lg-3" key={r.id}>
          <div className="room-card room-card-interactive" style={cardStyle} onClick={clickHandler}>
            <div className="room-card-icon" style={{ backgroundColor: `${r.color}22`, color: r.color }}>
              <i className="bi bi-door-open-fill"></i>
            </div>
            {badgeHtml}
            <h6>{r.name}</h6>
            <div className="meta"><i className="bi bi-building"></i> {r.building ? `${r.building} • ${r.floor}` : (r.floor || "ไม่ระบุอาคาร")}</div>
            <div className="meta"><i className="bi bi-people"></i> ความจุ {r.capacity} คน</div>
            {extraConflictInfo}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="page-fade">
      <div className="panel">
        <div className="panel-head">
          <h6><i className="bi bi-calendar-plus"></i> แบบฟอร์มการจองห้องประชุม</h6>
        </div>
        <div className="panel-body">
          
          {hasPending && !isAdmin && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle-fill"></i>
              คุณมีรายการที่ <strong>รออนุมัติ</strong> อยู่แล้ว 1 รายการ กรุณารอแอดมินอนุมัติก่อนทำการจองครั้งใหม่
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ pointerEvents: (!isAdmin && hasPending) ? 'none' : 'auto', opacity: (!isAdmin && hasPending) ? 0.6 : 1 }}>
            
            {/* SECTION 1: เลือกวันและเวลา */}
            <div className="p-3 mb-4 rounded" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>
              <h5 className="text-navy font-display mb-3" style={{ fontSize: '16px', fontWeight: 700 }}>
                <span className="badge bg-primary-soft me-2" style={{ backgroundColor: 'var(--navy)', color: '#fff' }}>ส่วนที่ 1</span> 
                เลือกวันและเวลาที่ต้องการจอง
              </h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">วันที่ต้องการจอง <span className="text-danger">*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    required 
                    min={getTodayISO()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setRoom(''); // reset room selection
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">เวลาเริ่มใช้งาน <span className="text-danger">*</span></label>
                  <div className="row g-2 align-items-center">
                    <div className="col-6 d-flex align-items-center gap-2">
                      <select className="form-select" value={startHour} onChange={(e) => { setStartHour(e.target.value); setRoom(''); }} required>
                        {getAvailableStartHours().map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-muted" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>ชั่วโมง</span>
                    </div>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <select className="form-select" value={startMin} onChange={(e) => { setStartMin(e.target.value); setRoom(''); }} required>
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="text-muted" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>นาที</span>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label">เวลาสิ้นสุดการใช้งาน <span className="text-danger">*</span></label>
                  <div className="row g-2 align-items-center">
                    <div className="col-6 d-flex align-items-center gap-2">
                      <select className="form-select" value={endHour} onChange={(e) => { setEndHour(e.target.value); setRoom(''); }} required>
                        {getAvailableEndHours().map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-muted" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>ชั่วโมง</span>
                    </div>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <select className="form-select" value={endMin} onChange={(e) => { setEndMin(e.target.value); setRoom(''); }} required>
                        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="text-muted" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>นาที</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: เลือกห้องประชุม */}
            <div className="p-3 mb-4 rounded" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>
              <h5 className="text-navy font-display mb-3" style={{ fontSize: '16px', fontWeight: 700 }}>
                <span className="badge bg-primary-soft me-2" style={{ backgroundColor: 'var(--navy)', color: '#fff' }}>ส่วนที่ 2</span> 
                ตรวจสอบและเลือกห้องประชุมที่ว่าง
              </h5>
              <div className="row g-3" id="roomCardsContainer">
                {renderRoomCards()}
              </div>
            </div>

            {/* SECTION 3: ข้อมูลผู้จอง */}
            <div className="p-3 mb-4 rounded" style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}>
              <h5 className="text-navy font-display mb-3" style={{ fontSize: '16px', fontWeight: 700 }}>
                <span className="badge bg-primary-soft me-2" style={{ backgroundColor: 'var(--navy)', color: '#fff' }}>ส่วนที่ 3</span> 
                ข้อมูลผู้จองและรายละเอียดการประชุม
              </h5>
              
              {targetHasPending && isAdmin && (
                <div className="alert alert-warning mb-3">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  บุคคลที่คุณกำลังเลือกทำรายการให้ มีรายการที่ <strong>รออนุมัติ</strong> อยู่แล้ว กรุณารอการอนุมัติรายการเดิมก่อนทำการจองใหม่
                </div>
              )}

              <div className="row g-3">
                {isAdmin && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">ประเภทผู้จอง <span className="text-danger">*</span></label>
                      <select className="form-select" value={bookerType} onChange={(e) => setBookerType(e.target.value)} required>
                        <option value="">-- เลือกประเภทผู้จอง --</option>
                        <option value="teacher">ครู / บุคลากรในโรงเรียน</option>
                        <option value="external">บุคคลภายนอก</option>
                      </select>
                    </div>
                    {bookerType === 'teacher' && (
                      <div className="col-md-6">
                        <label className="form-label">เลือกชื่อครู/บุคลากร <span className="text-danger">*</span></label>
                        <select className="form-select" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} required>
                          <option value="">-- เลือกชื่อ --</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.fullname || u.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="col-md-6">
                  <label className="form-label">ชื่อผู้จอง <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className={`form-control ${(!isAdmin || bookerType !== 'external') ? 'bg-light' : ''}`} 
                    placeholder={!isAdmin ? '' : (bookerType === 'external' ? 'พิมพ์ชื่อ-สกุล บุคคลภายนอก' : 'กรุณาเลือกประเภทผู้จองก่อน')}
                    required 
                    readOnly={!isAdmin || bookerType !== 'external'}
                    value={bookerName}
                    onChange={(e) => setBookerName(e.target.value)}
                  />
                  {isAdmin && (!bookerType || bookerType === 'teacher') && (
                    <div className="form-text">
                      {!bookerType ? 'กรุณาเลือกประเภทผู้จองด้านบนก่อน' : 'ชื่อและเบอร์โทรจะถูกดึงมาจากข้อมูลครู/บุคลากรที่เลือก'}
                    </div>
                  )}
                </div>
                
                <div className="col-md-6">
                  <label className="form-label">เบอร์โทรศัพท์ <span className="text-danger">*</span></label>
                  <input 
                    type="tel" 
                    className={`form-control ${(!isAdmin || bookerType !== 'external') ? 'bg-light' : ''} ${phone && !isValidPhone(phone) ? 'is-invalid' : ''}`} 
                    placeholder="0XX-XXX-XXXX" 
                    required 
                    maxLength={12}
                    readOnly={!isAdmin || bookerType !== 'external'}
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                  />
                  <div className="form-text">รูปแบบ: 0XX-XXX-XXXX (เช่น 081-234-5678)</div>
                  <div className="invalid-feedback">รูปแบบเบอร์โทรไม่ถูกต้อง กรุณากรอกในรูปแบบ 0XX-XXX-XXXX</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน <span className="text-danger">*</span></label>
                  {(isAdmin && bookerType === 'external') ? (
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ระบุชื่อหน่วยงาน/องค์กรภายนอก"
                      required 
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  ) : (
                    <select 
                      className="form-select bg-light" 
                      required 
                      disabled 
                      value={department}
                    >
                      <option value="">-- เลือกกลุ่มสาระฯ / ฝ่ายงาน --</option>
                      <option value="กลุ่มสาระการเรียนรู้ภาษาไทย">กลุ่มสาระการเรียนรู้ภาษาไทย</option>
                      <option value="กลุ่มสาระการเรียนรู้คณิตศาสตร์">กลุ่มสาระการเรียนรู้คณิตศาสตร์</option>
                      <option value="กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี">กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี</option>
                      <option value="กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม">กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม</option>
                      <option value="กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา">กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา</option>
                      <option value="กลุ่มสาระการเรียนรู้ศิลปะ">กลุ่มสาระการเรียนรู้ศิลปะ</option>
                      <option value="กลุ่มสาระการเรียนรู้การงานอาชีพ">กลุ่มสาระการเรียนรู้การงานอาชีพ</option>
                      <option value="กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ">กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ</option>
                      <option value="กลุ่มงานบริหารงานวิชาการ">กลุ่มงานบริหารงานวิชาการ</option>
                      <option value="กลุ่มงานบริหารงบประมาณและงานบุคคล">กลุ่มงานบริหารงบประมาณและงานบุคคล</option>
                      <option value="กลุ่มงานบริหารทั่วไป">กลุ่มงานบริหารทั่วไป</option>
                      {/* In case department from DB is not in list, it will show blank but we pre-populated it. Let's add it if it's custom. */}
                      {department && ![
                        "กลุ่มสาระการเรียนรู้ภาษาไทย", "กลุ่มสาระการเรียนรู้คณิตศาสตร์", "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
                        "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม", "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา", "กลุ่มสาระการเรียนรู้ศิลปะ",
                        "กลุ่มสาระการเรียนรู้การงานอาชีพ", "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ", "กลุ่มงานบริหารงานวิชาการ",
                        "กลุ่มงานบริหารงบประมาณและงานบุคคล", "กลุ่มงานบริหารทั่วไป"
                      ].includes(department) && (
                        <option value={department}>{department}</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">หัวข้อการประชุม <span className="text-danger">*</span></label>
                  <textarea 
                    className="form-control" 
                    placeholder="ระบุหัวข้อรายละเอียดการประชุม..." 
                    rows={3} 
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  ></textarea>
                </div>

                <div className="col-12">
                  <label className="form-label">อุปกรณ์ที่ต้องการ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น โปรเจคเตอร์, ไมโครโฟน 2 ตัว, ลำโพง (พิมพ์คั่นด้วยจุลภาค)"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                  />
                  <div className="form-text">ระบุอุปกรณ์ที่ต้องการใช้ในการประชุม คั่นด้วยเครื่องหมายจุลภาค (,)</div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="col-12 d-flex justify-content-end gap-2 mt-2">
              {editBookingId && (
                <button type="button" className="btn btn-secondary text-white" onClick={() => navigate('/my-bookings')}>
                  <i className="bi bi-x-circle"></i> ยกเลิก
                </button>
              )}
              <button type="submit" className="btn btn-primary-soft" disabled={loading || (!isAdmin && hasPending) || (isAdmin && targetHasPending)}>
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  editBookingId ? <><i className="bi bi-save"></i> บันทึกการแก้ไข</> : <><i className="bi bi-send-check"></i> ส่งคำขอจอง</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
