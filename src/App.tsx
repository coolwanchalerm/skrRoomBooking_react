import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import Approval from './pages/admin/Approval';
import Reports from './pages/admin/Reports';
import Users from './pages/admin/Users';
import Rooms from './pages/admin/Rooms';

import './index.css'; // Make sure to load global styles

// Redirect to dashboard if already logged in
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      {/* AppShell contains the Sidebar and Topbar and handles authentication internally as well */}
      <Route path="/" element={<AppShell />}>
        <Route index element={user?.role === 'admin' ? <Dashboard /> : <Navigate to="/calendar" replace />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="booking" element={<Booking />} />
        <Route path="my-bookings" element={<MyBookings />} />
        
        {/* Admin Routes */}
        <Route path="admin/approval" element={<Approval />} />
        <Route path="admin/reports" element={<Reports />} />
        <Route path="admin/users" element={<Users />} />
        <Route path="admin/rooms" element={<Rooms />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
