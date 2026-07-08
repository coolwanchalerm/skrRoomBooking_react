import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

// Note: For now, we mock the login. Later we will connect this to the actual API service.
export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the actual DB login logic
      const success = await login(username, password);
      
      if (success) {
        navigate('/');
      } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="login-screen">
      <div className="login-bg-shape"></div>
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <img src="https://sakolraj.ac.th/wp-content/uploads/2024/06/SKR-logo-T.png" alt="SKR Logo" />
          </div>
          <h1 className="login-title">SAKOLRAJ<span>BOOKING</span></h1>
          <p className="login-sub">ระบบจองห้องประชุม โรงเรียนสกลราชวิทยานุกูล</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">ชื่อผู้ใช้งาน</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-person-fill"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="เช่น admin / teacher1" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">รหัสผ่าน (เบอร์โทรศัพท์)</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-lock-fill"></i></span>
              <input 
                type="password" 
                className="form-control" 
                placeholder="กรอกเบอร์โทรศัพท์" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          {error && (
            <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontSize: '13.5px' }}>
              <i className="bi bi-exclamation-triangle-fill me-1"></i> <span>{error}</span>
            </div>
          )}
          
          <button type="submit" className="btn btn-login w-100" disabled={loading}>
            <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
            {loading && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
          </button>
        </form>

        <div className="login-demo">
          <p className="mb-1 fw-semibold"><i className="bi bi-info-circle"></i> บัญชีทดลองใช้งาน</p>
          <div className="d-flex flex-wrap gap-2 mt-2">
            <button 
              className="btn btn-demo" 
              onClick={() => handleDemoClick('admin', '0812345678')}
              type="button"
            >
              แอดมิน: admin / 0812345678
            </button>
            <button 
              className="btn btn-demo" 
              onClick={() => handleDemoClick('teacher1', '0898765432')}
              type="button"
            >
              ครู: teacher1 / 0898765432
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
