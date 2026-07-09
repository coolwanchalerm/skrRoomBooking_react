import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { DB } from '../../services/db';

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [color, setColor] = useState('#0e2a4a');
  const [status, setStatus] = useState('available');

  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => {
      window.removeEventListener('db-synced', loadData);
    };
  }, []);

  const loadData = () => {
    setRooms(DB.getRooms());
  };

  const openModal = (id: string | null = null) => {
    setEditId(id);
    if (id) {
      const r = rooms.find(room => String(room.id) === String(id));
      if (r) {
        setName(r.name || '');
        setBuilding(r.building || '');
        setFloor(r.floor || '');
        setCapacity(r.capacity ? String(r.capacity) : '20');
        setColor(r.color || '#0e2a4a');
        setStatus(r.status || 'available');
      }
    } else {
      setName('');
      setBuilding('');
      setFloor('');
      setCapacity('20');
      setColor('#0e2a4a');
      setStatus('available');
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(!name.trim() || !building.trim() || !floor.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'warning');
      return;
    }

    setIsSaving(true);
    
    const roomData = {
      name: name.trim(),
      building: building.trim(),
      floor: floor.trim(),
      capacity: parseInt(capacity) || 20,
      color,
      status
    };

    try {
      if (editId) {
        await DB.updateRoom(editId, roomData);
      } else {
        await DB.addRoom(roomData);
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

  const handleDelete = (id: string | number) => {
    Swal.fire({
      title: 'ยืนยันการลบห้องประชุม?',
      text: "ลบแล้วไม่สามารถกู้คืนได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc3545'
    }).then(async (res) => {
      if (res.isConfirmed) {
        setDeletingId(id);
        try {
          await DB.deleteRoom(id);
          Swal.fire({icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false});
          loadData();
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  return (
    <div className="page-fade">
      <div className="panel">
        <div className="panel-head flex-wrap gap-2">
          <h6><i className="bi bi-door-open"></i> จัดการข้อมูลห้องประชุม</h6>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-primary-soft" onClick={() => openModal()}>
              <i className="bi bi-plus-lg"></i> เพิ่มห้องประชุม
            </button>
          </div>
        </div>
        <div className="panel-body p-0 bg-light rounded-bottom" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
          <div className="row g-4 p-4">
            {rooms.length === 0 ? (
              <div className="col-12 text-center text-muted py-5">
                <i className="bi bi-door-closed fs-1 mb-3 d-block opacity-50"></i>
                ไม่มีห้องประชุม
              </div>
            ) : (
              rooms.map((r) => (
                <div key={r.id} className="col-12 col-md-6 col-lg-4">
                  <div className="room-gallery-card">
                     <div className="room-card-image" style={{ backgroundColor: r.color || '#0e2a4a' }}>
                       <i className="bi bi-door-open-fill"></i>
                     </div>
                     <div className="room-card-content">
                       <div className="d-flex justify-content-between align-items-start mb-3">
                         <h5 className="room-card-title text-truncate pe-2">{r.name}</h5>
                         <span className={`badge ${r.status === 'maintenance' ? 'bg-danger' : 'bg-success'}`}>
                           {r.status === 'maintenance' ? 'ปิดปรับปรุง' : 'พร้อมใช้งาน'}
                         </span>
                       </div>
                       <p className="room-card-desc"><i className="bi bi-building"></i> อาคาร: {r.building || "-"} | ชั้น: {r.floor || "-"}</p>
                       <p className="room-card-capacity"><i className="bi bi-people-fill"></i> ความจุ: {r.capacity || '-'} คน</p>
                     </div>
                     <div className="room-card-actions">
                       <button className="btn btn-sm btn-outline-primary w-50" onClick={() => openModal(r.id)}>
                         <i className="bi bi-pencil"></i> แก้ไข
                       </button>
                       <button className="btn btn-sm btn-outline-danger w-50" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}>
                         {deletingId === r.id ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-trash"></i> ลบ</>}
                       </button>
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Room Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-light">
                <h5 className="modal-title">{editId ? 'แก้ไขห้องประชุม' : 'เพิ่มห้องประชุม'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSaveRoom}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label">ชื่อห้องประชุม <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">อาคาร <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={building}
                        onChange={e => setBuilding(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">ชั้น <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        value={floor}
                        onChange={e => setFloor(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ความจุ (จำนวนคน) <span className="text-danger">*</span></label>
                    <input 
                      type="number" 
                      className="form-control" 
                      required 
                      min="1"
                      value={capacity}
                      onChange={e => setCapacity(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">สีสัญลักษณ์ของห้อง</label>
                    <input 
                      type="color" 
                      className="form-control form-control-color w-100" 
                      title="เลือกสี"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">สถานะการใช้งาน <span className="text-danger">*</span></label>
                    <select 
                      className="form-select" 
                      required
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                    >
                      <option value="available">พร้อมใช้งาน (เปิดให้จอง)</option>
                      <option value="maintenance">ปิดปรับปรุง (งดให้บริการ)</option>
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
