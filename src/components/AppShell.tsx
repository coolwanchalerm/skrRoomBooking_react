import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (window.innerWidth < 992) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      <div className="main-area">
        <Topbar onToggleSidebar={toggleSidebar} />
        
        <main className="content" id="content" onClick={closeSidebar}>
          <Outlet />
        </main>
        
        <BottomNav onToggleSidebar={toggleSidebar} />
      </div>
    </div>
  );
}
