import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={`sidebar ${isOpen ? 'show' : ''}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo"><i className="bi bi-bank2"></i></div>
        <div>
          <div className="sb-title">SAKOLRAJ</div>
          <div className="sb-sub">ระบบจองห้องประชุม</div>
        </div>
        <button className="btn btn-icon d-lg-none ms-auto text-white border-0 bg-transparent" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      <nav className="sidebar-nav" id="sidebarNav">
        {isAdmin && (
          <>
            <div className="nav-section-label">สำหรับผู้ดูแลระบบ</div>
            <Link to="/" className={`nav-link-item ${isActive('/') ? 'active' : ''}`} onClick={onClose}>
              <i className="bi bi-grid-fill"></i> แดชบอร์ด
            </Link>
          </>
        )}
        <Link to="/calendar" className={`nav-link-item ${isActive('/calendar') || (!isAdmin && isActive('/')) ? 'active' : ''}`} onClick={onClose}>
          <i className="bi bi-calendar-week"></i> ปฏิทินการจอง
        </Link>
        <Link to="/booking" className={`nav-link-item ${isActive('/booking') ? 'active' : ''}`} onClick={onClose}>
          <i className="bi bi-pencil-square"></i> จองห้องประชุม
        </Link>
        <Link to="/my-bookings" className={`nav-link-item ${isActive('/my-bookings') ? 'active' : ''}`} onClick={onClose}>
          {isAdmin ? (
            <><i className="bi bi-card-checklist"></i> รายการจองทั้งหมด</>
          ) : (
            <><i className="bi bi-card-list"></i> การจองของฉัน</>
          )}
        </Link>

        {isAdmin && (
          <>
            <Link to="/admin/approval" className={`nav-link-item ${isActive('/admin/approval') ? 'active' : ''}`} onClick={onClose}>
              <i className="bi bi-check-circle"></i> อนุมัติการจอง
            </Link>
            <Link to="/admin/reports" className={`nav-link-item ${isActive('/admin/reports') ? 'active' : ''}`} onClick={onClose}>
              <i className="bi bi-file-earmark-bar-graph"></i> รายงานสถิติ
            </Link>
            <Link to="/admin/users" className={`nav-link-item ${isActive('/admin/users') ? 'active' : ''}`} onClick={onClose}>
              <i className="bi bi-people"></i> จัดการผู้ใช้งาน
            </Link>
            <Link to="/admin/rooms" className={`nav-link-item ${isActive('/admin/rooms') ? 'active' : ''}`} onClick={onClose}>
              <i className="bi bi-door-open"></i> จัดการห้องประชุม
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-logout w-100" onClick={logout}>
          <i className="bi bi-box-arrow-right"></i> ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
