import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  onToggleSidebar: () => void;
}

export default function BottomNav({ onToggleSidebar }: BottomNavProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <nav className="bottom-nav d-flex d-lg-none">
      <NavLink 
        to="/calendar" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className="bi bi-calendar-week"></i>
        <span>ปฏิทิน</span>
      </NavLink>

      <NavLink 
        to="/booking" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className="bi bi-pencil-square"></i>
        <span>จองห้อง</span>
      </NavLink>

      <NavLink 
        to={isAdmin ? "/admin/approval" : "/my-bookings"} 
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <i className={isAdmin ? "bi bi-check-circle" : "bi bi-card-list"}></i>
        <span>{isAdmin ? "อนุมัติ" : "รายการ"}</span>
      </NavLink>

      <button 
        className="bottom-nav-item border-0 bg-transparent" 
        onClick={onToggleSidebar}
      >
        <i className="bi bi-list"></i>
        <span>เมนู</span>
      </button>
    </nav>
  );
}
