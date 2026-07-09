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
  
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [date, setDate] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('12:00');
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

  const getTodayISO = () => {
    return todayISO(0);
  };

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
        if (b.timeStart) setStartTimeStr(b.timeStart);
        if (b.timeEnd) setEndTimeStr(b.timeEnd);
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
        setBookerName(user.fullname || user.fullname || '');
        let p = String(user.phone || '');
        if (p && !p.startsWith('0')) p = '0' + p;
        setPhone(formatPhone(p));
        setDepartment(user.department || '');
      }
    }
  }, [user, editBookingId, isAdmin]);

  // Handle booker type change for admins
  useEffect(() => {
    if (!isAdmin || editBookingId) return;
    if (bookerType === 'teacher' || bookerType === 'external' || !bookerType) {
      setSelectedTeacherId('');
      setBookerName('');
      setPhone('');
      setDepartment('');
    }
  }, [bookerType, isAdmin, editBookingId]);

  // Handle teacher selection for admins
  useEffect(() => {
    if (!isAdmin || bookerType !== 'teacher') return;
    if (selectedTeacherId) {
      const teacher = allUsers.find(u => String(u.id) === selectedTeacherId);
      if (teacher) {
        setBookerName(teacher.fullname || teacher.fullname || '');
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
      isPending = bookings.some((b: any) => b.id !== editBookingId && b.userId === parseInt(selectedTeacherId) && b.status === 'pending');
    } else if (bookerType === 'external' && bookerName && phone) {
      isPending = bookings.some((b: any) => b.id !== editBookingId && b.isExternal && b.bookerName === bookerName && b.phone === phone && b.status === 'pending');
    }
    setTargetHasPending(isPending);
  }, [isAdmin, bookerType, selectedTeacherId, bookerName, phone, editBookingId]);

  const handleNextStep1 = () => {
    setErrorMessage('');
    if (!date) {
      setErrorMessage('กรุณาเลือกวันที่ต้องการจอง');
      return;
    }
    if (!startTimeStr || !endTimeStr) {
      setErrorMessage('กรุณาระบุเวลาให้ครบถ้วน');
      return;
    }
    if (startTimeStr >= endTimeStr) {
      setErrorMessage('เวลาสิ้นสุดการจอง ต้องมากกว่าเวลาเริ่มต้น');
      return;
    }
    if (date === getTodayISO()) {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`;
      if (startTimeStr < currentTime) {
        setErrorMessage('ไม่สามารถจองเวลาที่ผ่านมาแล้วได้');
        return;
      }
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMessage('');
    if (!room) {
      setErrorMessage('กรุณาเลือกห้องประชุมที่ว่างก่อนดำเนินการต่อ');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    
    if (!isValidPhone(phone)) {
      setErrorMessage('รูปแบบเบอร์โทรไม่ถูกต้อง กรุณากรอกในรูปแบบ 0XX-XXX-XXXX');
      setLoading(false);
      return;
    }

    if (DB.hasConflict(parseInt(room), date, startTimeStr, endTimeStr, editBookingId)) {
      setErrorMessage('ห้องประชุมมีการถูกจองตัดหน้าในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกเวลาหรือห้องอื่น');
      setLoading(false);
      setStep(2); // Go back to room selection
      return;
    }

    const isExternal = isAdmin && bookerType === 'external';
    let bookingUserId = user?.id;
    if (isAdmin && bookerType === 'teacher' && selectedTeacherId) {
      bookingUserId = parseInt(selectedTeacherId);
    } else if (isAdmin && bookerType === 'external') {
      bookingUserId = undefined; 
    }
    
    const bookings = DB.getBookings();
    const hasPendingForTarget = bookings.some((b: any) => 
      b.id !== editBookingId && b.status === 'pending' && 
      (
        (bookingUserId && b.userId === bookingUserId) || 
        (!bookingUserId && b.isExternal && b.bookerName === bookerName && b.phone === phone)
      )
    );

    if (hasPendingForTarget) {
      setErrorMessage('บุคคลนี้มีรายการจองที่รออนุมัติอยู่แล้ว ไม่สามารถจองซ้ำได้จนกว่าจะได้รับการอนุมัติ');
      setLoading(false);
      return;
    }

    const newBooking = {
      userId: bookingUserId,
      isExternal,
      bookerName,
      phone,
      department,
      roomId: parseInt(room),
      topic,
      date,
      timeStart: startTimeStr,
      timeEnd: endTimeStr,
      equipment
    };

    try {
      if (editBookingId) {
        await DB.updateBooking(editBookingId, newBooking);
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', confirmButtonColor: '#13a446' }).then(() => navigate('/my-bookings'));
      } else {
        await DB.addBooking(newBooking);
        Swal.fire({ icon: 'success', title: 'จองห้องสำเร็จ', text: 'รอการอนุมัติ', confirmButtonColor: '#13a446' }).then(() => {
          if (!isAdmin || bookingUserId === user?.id) setHasPending(true); 
          navigate('/my-bookings');
        });
      }
    } catch (e) {
      setErrorMessage('เกิดข้อผิดพลาด ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const renderRoomCards = () => {
    return rooms.map(r => {
      const isMaintenance = r.status === 'maintenance';
      
      const isConflicted = !isMaintenance && DB.hasConflict(r.id, date, startTimeStr, endTimeStr, editBookingId);
      const isSelected = room === String(r.id);
      
      let badgeHtml = null;
      let cardStyle: any = { borderLeft: `5px solid ${r.color || 'var(--gold)'}`, transition: '0.2s', cursor: 'pointer' };
      let clickHandler = undefined;
      let extraConflictInfo = null;

      if (isMaintenance) {
        badgeHtml = <span className="badge bg-warning text-dark mb-2"><i className="bi bi-tools"></i> ปิดปรับปรุง</span>;
        cardStyle = { ...cardStyle, opacity: 0.55, cursor: 'not-allowed', backgroundColor: '#f5f5f5', borderLeftColor: '#aaa' };
      } else if (isConflicted) {
        badgeHtml = <span className="badge bg-danger-subtle text-danger mb-2"><i className="bi bi-x-circle-fill"></i> ไม่ว่างในช่วงเวลานี้</span>;
        cardStyle = { ...cardStyle, opacity: 0.65, cursor: 'not-allowed', backgroundColor: '#fafafa' };
        
        const activeBooking = DB.getBookings().find((b: any) =>
          b.roomId === r.id && b.date === date && b.status !== 'cancelled' &&
          (startTimeStr < b.timeEnd && endTimeStr > b.timeStart) && b.id !== editBookingId
        );
        
        if (activeBooking) {
          extraConflictInfo = (
            <div className="mt-2 p-2 bg-light rounded text-start" style={{ fontSize: '11px', borderLeft: '2px solid var(--red)' }}>
              <strong>ติดคิว:</strong> {activeBooking.timeStart}-{activeBooking.timeEnd} <br/>
              <strong>โดย:</strong> {activeBooking.bookerName}
            </div>
          );
        }
      } else {
        badgeHtml = <span className="badge bg-success-subtle text-success mb-2"><i className="bi bi-check-circle-fill"></i> ว่าง</span>;
        if (isSelected) {
          cardStyle.borderColor = 'var(--gold)';
          cardStyle.backgroundColor = 'var(--gold-soft)';
          cardStyle.boxShadow = '0 4px 12px rgba(217,164,64,0.25)';
          cardStyle.transform = 'scale(1.02)';
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
    <div className="page-fade pb-5">
      
      {/* STEPPER HEADER */}
      <div className="stepper-wrapper mb-4 mx-auto" style={{ maxWidth: '600px' }}>
        <div className={`stepper-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-counter">1</div>
          <div className="step-name">เลือกเวลา</div>
        </div>
        <div className={`stepper-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-counter">2</div>
          <div className="step-name">เลือกห้อง</div>
        </div>
        <div className={`stepper-item ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <div className="step-counter">3</div>
          <div className="step-name">รายละเอียด</div>
        </div>
      </div>

      <div className="panel" style={{ overflow: 'visible' }}>
        <div className="panel-body p-4">
          
          {hasPending && !isAdmin && (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle-fill"></i> คุณมีรายการที่ <strong>รออนุมัติ</strong> อยู่แล้ว 1 รายการ กรุณารอแอดมินอนุมัติก่อนทำการจองใหม่
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ pointerEvents: (!isAdmin && hasPending) ? 'none' : 'auto', opacity: (!isAdmin && hasPending) ? 0.6 : 1 }}>
            
            {/* STEP 1: Date & Time */}
            {step === 1 && (
              <div className="step-content animation-fade-in mx-auto" style={{ maxWidth: '600px' }}>
                <h5 className="text-navy font-display mb-4 text-center fw-bold">เลือกวันและเวลาที่ต้องการ</h5>
                <div className="row g-4">
                  <div className="col-12">
                    <label className="form-label fw-bold">วันที่ต้องการจอง <span className="text-danger">*</span></label>
                    <input 
                      type="date" 
                      className="form-control form-control-lg" 
                      required 
                      min={getTodayISO()}
                      value={date}
                      onChange={(e) => { setDate(e.target.value); setRoom(''); }}
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                  <div className="col-md-6 col-6">
                    <label className="form-label fw-bold">เวลาเริ่ม <span className="text-danger">*</span></label>
                    <input 
                      type="time" 
                      className="form-control form-control-lg" 
                      required 
                      value={startTimeStr}
                      onChange={(e) => { setStartTimeStr(e.target.value); setRoom(''); }}
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                  <div className="col-md-6 col-6">
                    <label className="form-label fw-bold">เวลาสิ้นสุด <span className="text-danger">*</span></label>
                    <input 
                      type="time" 
                      className="form-control form-control-lg" 
                      required 
                      value={endTimeStr}
                      onChange={(e) => { setEndTimeStr(e.target.value); setRoom(''); }}
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                </div>
                
                {errorMessage && (
                  <div className="alert alert-danger mt-4 d-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                    {errorMessage}
                  </div>
                )}

                <div className="d-flex justify-content-end mt-4">
                  <button type="button" className="btn btn-primary-soft px-4 py-2 w-100 w-sm-auto" style={{ borderRadius: '50px' }} onClick={handleNextStep1}>
                    ถัดไป <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Room Selection */}
            {step === 2 && (
              <div className="step-content animation-fade-in">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="text-navy font-display mb-0 fw-bold">เลือกห้องประชุม</h5>
                  <div className="badge bg-light text-dark px-3 py-2" style={{ borderRadius: '20px' }}>
                    <i className="bi bi-clock"></i> {date} | {startTimeStr} - {endTimeStr}
                  </div>
                </div>
                
                <div className="row g-3" id="roomCardsContainer">
                  {renderRoomCards()}
                </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-4 d-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                    {errorMessage}
                  </div>
                )}

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-light px-4 py-2" style={{ borderRadius: '50px' }} onClick={() => { setStep(1); setErrorMessage(''); }}>
                    <i className="bi bi-arrow-left"></i> ย้อนกลับ
                  </button>
                  <button type="button" className="btn btn-primary-soft px-4 py-2" style={{ borderRadius: '50px' }} onClick={handleNextStep2} disabled={!room}>
                    ถัดไป <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Booker Details */}
            {step === 3 && (
              <div className="step-content animation-fade-in mx-auto" style={{ maxWidth: '800px' }}>
                <h5 className="text-navy font-display mb-4 text-center fw-bold">ข้อมูลผู้จองและรายละเอียด</h5>
                
                {targetHasPending && isAdmin && (
                  <div className="alert alert-warning mb-4">
                    <i className="bi bi-exclamation-triangle-fill"></i> บุคคลที่คุณกำลังเลือกทำรายการให้ มีรายการที่ <strong>รออนุมัติ</strong> อยู่แล้ว 
                  </div>
                )}

                <div className="row g-4">
                  {isAdmin && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">ประเภทผู้จอง <span className="text-danger">*</span></label>
                        <select className="form-select form-select-lg" value={bookerType} onChange={(e) => setBookerType(e.target.value)} required style={{ borderRadius: '12px' }}>
                          <option value="">-- เลือกประเภทผู้จอง --</option>
                          <option value="teacher">ครู / บุคลากรในโรงเรียน</option>
                          <option value="external">บุคคลภายนอก</option>
                        </select>
                      </div>
                      {bookerType === 'teacher' && (
                        <div className="col-md-6">
                          <label className="form-label fw-bold">เลือกชื่อครู/บุคลากร <span className="text-danger">*</span></label>
                          <select className="form-select form-select-lg" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} required style={{ borderRadius: '12px' }}>
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
                    <label className="form-label fw-bold">ชื่อผู้จอง <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className={`form-control form-control-lg ${(!isAdmin || bookerType !== 'external') ? 'bg-light' : ''}`} 
                      placeholder={!isAdmin ? '' : (bookerType === 'external' ? 'พิมพ์ชื่อ-สกุล บุคคลภายนอก' : 'กรุณาเลือกประเภทผู้จองก่อน')}
                      required 
                      readOnly={!isAdmin || bookerType !== 'external'}
                      value={bookerName}
                      onChange={(e) => setBookerName(e.target.value)}
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label className="form-label fw-bold">เบอร์โทรศัพท์ <span className="text-danger">*</span></label>
                    <input 
                      type="tel" 
                      className={`form-control form-control-lg ${(!isAdmin || bookerType !== 'external') ? 'bg-light' : ''} ${phone && !isValidPhone(phone) ? 'is-invalid' : ''}`} 
                      placeholder="0XX-XXX-XXXX" 
                      required 
                      maxLength={12}
                      readOnly={!isAdmin || bookerType !== 'external'}
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      style={{ borderRadius: '12px' }}
                    />
                    <div className="invalid-feedback">รูปแบบเบอร์โทรไม่ถูกต้อง กรุณากรอกในรูปแบบ 0XX-XXX-XXXX</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน <span className="text-danger">*</span></label>
                    {(isAdmin && bookerType === 'external') ? (
                      <input 
                        type="text" 
                        className="form-control form-control-lg" 
                        placeholder="ระบุชื่อหน่วยงาน/องค์กรภายนอก"
                        required 
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        style={{ borderRadius: '12px' }}
                      />
                    ) : (
                      <select 
                        className="form-select form-select-lg bg-light" 
                        required 
                        disabled 
                        value={department}
                        style={{ borderRadius: '12px' }}
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

                  <div className="col-12">
                    <label className="form-label fw-bold">หัวข้อการประชุม <span className="text-danger">*</span></label>
                    <textarea 
                      className="form-control form-control-lg" 
                      placeholder="ระบุหัวข้อรายละเอียดการประชุม..." 
                      required
                      rows={3}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      style={{ borderRadius: '12px', resize: 'none' }}
                    ></textarea>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold">อุปกรณ์ที่ต้องการ</label>
                    <textarea 
                      className="form-control form-control-lg" 
                      placeholder="เช่น โปรเจคเตอร์, ไมโครโฟน 2 ตัว (พิมพ์คั่นด้วยจุลภาค)"
                      rows={2}
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      style={{ borderRadius: '12px', resize: 'none' }}
                    ></textarea>
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-4 d-flex align-items-center" style={{ borderRadius: '12px' }}>
                    <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                    {errorMessage}
                  </div>
                )}

                <div className="d-flex justify-content-between mt-4">
                  <button type="button" className="btn btn-light px-4 py-2" style={{ borderRadius: '50px' }} onClick={() => { setStep(2); setErrorMessage(''); }}>
                    <i className="bi bi-arrow-left"></i> ย้อนกลับ
                  </button>
                  <button type="submit" className="btn btn-primary-soft px-4 py-2" style={{ borderRadius: '50px' }} disabled={loading || (!isAdmin && hasPending) || (isAdmin && targetHasPending)}>
                    {loading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      editBookingId ? <><i className="bi bi-save"></i> บันทึกการแก้ไข</> : <><i className="bi bi-send-check"></i> ยืนยันการจอง</>
                    )}
                  </button>
                </div>
              </div>
            )}
            
          </form>
        </div>
      </div>
    </div>
  );
}
