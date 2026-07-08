import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  onToggleSidebar: () => void;
}

const pageTitles: Record<string, string> = {
  '/': 'แดชบอร์ด',
  '/calendar': 'ปฏิทินการจอง',
  '/booking': 'จองห้องประชุม',
  '/my-bookings': 'การจองของฉัน',
  '/admin/approval': 'อนุมัติการจอง',
  '/admin/reports': 'รายงานสถิติ',
  '/admin/users': 'จัดการผู้ใช้งาน',
  '/admin/rooms': 'จัดการห้องประชุม',
};

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user } = useAuth();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'ระบบจองห้องประชุม';
  const initial = user?.fullname ? user.fullname.charAt(0) : 'U';

  return (
    <header className="topbar">
      <button className="btn btn-icon d-lg-none" onClick={onToggleSidebar}>
        <i className="bi bi-list"></i>
      </button>
      <div className="topbar-title">{title}</div>
      
      {user && (
        <div className="topbar-user">
          <div className="text-end d-none d-sm-block">
            <div className="tu-name">{user.fullname}</div>
            <div className="tu-role">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป'}</div>
          </div>
          <div className="tu-avatar">{initial}</div>
        </div>
      )}
    </header>
  );
}
