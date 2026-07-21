import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { DB } from '../services/db';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const { user } = useAuth();
  
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Filter State
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const load = () => {
      setAllBookings(DB.getBookings());
      setRooms(DB.getRooms());
    };
    load();
    window.addEventListener('db-synced', load);
    return () => window.removeEventListener('db-synced', load);
  }, []);

  // Filter options derived from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allBookings.forEach(b => {
      if (b.date) years.add(b.date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [allBookings]);

  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    allBookings.forEach(b => {
      if (b.department) depts.add(b.department);
      else if (b.isExternal) depts.add('__external__');
    });
    return Array.from(depts).filter(d => d !== '__external__').sort();
  }, [allBookings]);

  // Apply Filters to Bookings
  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      if (filterYear && b.date && !b.date.startsWith(filterYear)) return false;
      if (filterMonth && b.date && b.date.substring(5, 7) !== filterMonth) return false;
      
      if (filterDept) {
        if (filterDept === '__external__' && !b.isExternal) return false;
        if (filterDept !== '__external__' && b.department !== filterDept) return false;
      }
      return true;
    });
  }, [allBookings, filterYear, filterMonth, filterDept]);

  // Stats calculation based on filteredBookings
  const stats = useMemo(() => {
    let totalCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let cancelledCount = 0;

    const roomUsage: Record<number, number> = {};
    const deptUsage: Record<string, number> = {};

    filteredBookings.forEach(b => {
      totalCount++;
      if (b.status === 'pending') pendingCount++;
      else if (b.status === 'approved') approvedCount++;
      else if (b.status === 'cancelled') cancelledCount++;

      if (b.status !== 'cancelled') {
        roomUsage[b.roomId] = (roomUsage[b.roomId] || 0) + 1;
        const d = b.isExternal ? 'บุคคลภายนอก' : (b.department || 'อื่นๆ');
        deptUsage[d] = (deptUsage[d] || 0) + 1;
      }
    });

    const roomLabels: string[] = [];
    const roomData: number[] = [];
    const roomColors: string[] = [];
    
    rooms.forEach(r => {
      roomLabels.push(r.name);
      roomData.push(roomUsage[r.id] || 0);
      roomColors.push(r.color || '#0e2a4a');
    });

    return {
      totalCount,
      pendingCount,
      approvedCount,
      cancelledCount,
      roomLabels,
      roomData,
      roomColors,
      deptLabels: Object.keys(deptUsage),
      deptData: Object.values(deptUsage)
    };
  }, [filteredBookings, rooms]);

  const barChartData = {
    labels: stats.roomLabels,
    datasets: [
      {
        label: 'จำนวนการจอง (ครั้ง)',
        data: stats.roomData,
        backgroundColor: stats.roomColors,
      }
    ]
  };

  const pieChartData = {
    labels: stats.deptLabels.length ? stats.deptLabels : ['ไม่มีข้อมูล'],
    datasets: [
      {
        data: stats.deptData.length ? stats.deptData : [1],
        backgroundColor: stats.deptData.length ? ['#1e3c72', '#2a5298', '#f2994a', '#11998e', '#eb3349', '#9b59b6'] : ['#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { borderDash: [5, 5], color: '#f1f5f9' } }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const }
    }
  };

  const getRoomName = (roomId: number) => {
    const r = rooms.find(x => String(x.id) === String(roomId));
    return r ? r.name : 'ไม่ทราบ';
  };

  const resetFilters = () => {
    setFilterYear('');
    setFilterMonth('');
    setFilterDept('');
    setCurrentPage(1);
  };

  // Table Filtering
  const tableData = useMemo(() => {
    let data = [...allBookings];
    if (statusFilter) {
      data = data.filter(b => b.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(b => 
        (b.topic && b.topic.toLowerCase().includes(term)) ||
        (b.bookerName && b.bookerName.toLowerCase().includes(term)) ||
        (getRoomName(b.roomId).toLowerCase().includes(term)) ||
        (b.department && b.department.toLowerCase().includes(term))
      );
    }
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return data;
  }, [allBookings, statusFilter, searchTerm, rooms]);

  // Pagination calculation
  const totalPages = Math.ceil(tableData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableData.slice(startIndex, startIndex + itemsPerPage);
  }, [tableData, currentPage, itemsPerPage]);

  // Effect to reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="page-fade">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-white p-2 rounded-circle shadow-sm" style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-person-circle text-primary" style={{ fontSize: '28px' }}></i>
          </div>
          <div>
            <h4 className="mb-0 text-navy font-display" style={{ fontWeight: 800 }}>
              ภาพรวมระบบจองห้องประชุม
            </h4>
            <p className="text-muted mb-0" style={{ fontSize: '14.5px' }}>
              ยินดีต้อนรับกลับมา, <span className="fw-bold text-dark">{user?.fullname || user?.username}</span> 👋
            </p>
          </div>
        </div>
        <div className="bg-white px-3 py-2 rounded-pill shadow-sm text-muted" style={{ fontSize: '13px', fontWeight: 500 }}>
          <i className="bi bi-clock-history me-1 text-primary"></i> ข้อมูลอัปเดต: {new Date().toLocaleTimeString('th-TH')} น.
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3">
          <div className="stat-card stat-1">
            <div className="stat-icon"><i className="bi bi-calendar-check"></i></div>
            <div className="stat-num">{stats.totalCount}</div>
            <div className="stat-label">การจองทั้งหมด</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card stat-2">
            <div className="stat-icon"><i className="bi bi-hourglass-split"></i></div>
            <div className="stat-num">{stats.pendingCount}</div>
            <div className="stat-label">รออนุมัติ</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card stat-3">
            <div className="stat-icon"><i className="bi bi-check-circle"></i></div>
            <div className="stat-num">{stats.approvedCount}</div>
            <div className="stat-label">อนุมัติแล้ว</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="stat-card stat-4">
            <div className="stat-icon"><i className="bi bi-x-circle"></i></div>
            <div className="stat-num">{stats.cancelledCount}</div>
            <div className="stat-label">ยกเลิก</div>
          </div>
        </div>
      </div>

      {/* Dashboard Data Filter */}
      <div className="modern-filter-container mt-4 mb-4" style={{ backgroundColor: '#fff', padding: '15px 20px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div className="d-flex align-items-center gap-2" style={{ fontWeight: 600, color: 'var(--navy)' }}>
          <i className="bi bi-funnel-fill text-primary"></i> กรองข้อมูลสถิติ
        </div>
        <div className="filter-controls ms-auto">
          <select className="filter-control-item" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">ทุกปี</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="filter-control-item" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">ทุกเดือน</option>
            <option value="01">มกราคม</option>
            <option value="02">กุมภาพันธ์</option>
            <option value="03">มีนาคม</option>
            <option value="04">เมษายน</option>
            <option value="05">พฤษภาคม</option>
            <option value="06">มิถุนายน</option>
            <option value="07">กรกฎาคม</option>
            <option value="08">สิงหาคม</option>
            <option value="09">กันยายน</option>
            <option value="10">ตุลาคม</option>
            <option value="11">พฤศจิกายน</option>
            <option value="12">ธันวาคม</option>
          </select>
          <select className="filter-control-item" style={{ maxWidth: '200px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">ทุกกลุ่มสาระ/ฝ่ายงาน</option>
            <option value="__external__">บุคคลภายนอก</option>
            {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(filterYear || filterMonth || filterDept) && (
            <button className="btn btn-sm btn-light rounded-pill px-3" onClick={resetFilters} style={{ border: '1px solid #e2e8f0', color: 'var(--navy)' }}>
              <i className="bi bi-x-circle me-1"></i> ล้างค่า
            </button>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="panel-head">
              <h6><i className="bi bi-door-open"></i> สถิติการใช้งานห้องประชุม</h6>
            </div>
            <div className="panel-body">
              <div style={{ position: 'relative', height: '220px' }}>
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="panel-head">
              <h6><i className="bi bi-building-gear"></i> สัดส่วนสถิติแยกตามกลุ่มสาระฯ</h6>
            </div>
            <div className="panel-body">
              <div style={{ position: 'relative', height: '220px' }}>
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head border-0 pb-0">
          <h6 className="mb-0"><i className="bi bi-clock-history text-primary me-2"></i> ประวัติการจองล่าสุด</h6>
        </div>
        
        <div className="modern-filter-container mt-3">
          <div className="filter-tabs-scroll">
            <button className={`filter-btn ${statusFilter === '' ? 'active' : ''}`} onClick={() => { setStatusFilter(''); setCurrentPage(1); }}>ทั้งหมด</button>
            <button className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}>รออนุมัติ</button>
            <button className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`} onClick={() => { setStatusFilter('approved'); setCurrentPage(1); }}>อนุมัติ</button>
            <button className={`filter-btn ${statusFilter === 'cancelled' ? 'active' : ''}`} onClick={() => { setStatusFilter('cancelled'); setCurrentPage(1); }}>ยกเลิก</button>
          </div>
          <div className="filter-controls">
            <input className="filter-control-item" placeholder="ค้นหา..." type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: '130px' }} />
            <select className="filter-control-item" value={filterYear} onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}>
              <option value="">ทุกปี</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="filter-control-item" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}>
              <option value="">ทุกเดือน</option>
              {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>เดือน {m}</option>)}
            </select>
          </div>
        </div>

        <div className="panel-body p-0 mt-2">
          <div className="d-flex flex-column gap-3 p-3 p-md-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {paginatedData.length > 0 ? (
              <div className="w-100">
                {/* Mobile / Tablet Cards */}
                <div className="d-block d-md-none">
                  <div className="row g-3">
                    {paginatedData.map((b: any) => (
                      <div key={b.id} className="col-12 col-md-6">
                        <div className={`mobile-card status-${b.status}`}>
                          <div className="mobile-card-header">
                            <h6 className="mobile-card-title text-truncate" title={b.topic}>{b.topic}</h6>
                            <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                              {b.status === 'pending' && <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>}
                              {b.status === 'approved' && <span className="badge-status badge-approved" style={{color: 'white', background: 'transparent'}}><i className="bi bi-check-circle"></i> อนุมัติแล้ว</span>}
                              {b.status === 'cancelled' && <span className="badge-status badge-cancelled" style={{color: 'white', background: 'transparent'}}><i className="bi bi-x-circle"></i> ยกเลิก</span>}
                            </span>
                          </div>
                          <div className="mobile-card-body">
                            <p className="mb-2"><i className="bi bi-person"></i> <strong>{b.bookerName}</strong></p>
                            <p className="mb-2"><i className="bi bi-tag-fill"></i> {b.department || 'ไม่ระบุสังกัด'}</p>
                            <p className="mb-2"><i className="bi bi-geo-alt"></i> <strong>{getRoomName(b.roomId)}</strong></p>
                            <p className="mb-2"><i className="bi bi-calendar-event"></i> {new Date(b.date).toLocaleDateString('th-TH')}</p>
                            <p className="mb-0"><i className="bi bi-clock"></i> {b.timeStart} - {b.timeEnd}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="d-none d-md-block">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th className="ps-3">หัวข้อการประชุม</th>
                          <th>ผู้จอง / สังกัด</th>
                          <th>ห้องประชุม</th>
                          <th>วันที่</th>
                          <th>เวลา</th>
                          <th className="pe-3 text-end">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((b: any) => (
                          <tr key={b.id}>
                            <td className="ps-3">
                              <div className="fw-semibold text-navy">{b.topic}</div>
                            </td>
                            <td>
                              <div className="fw-bold">{b.bookerName}</div>
                              <div className="small text-muted">{b.department || '-'}</div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border"><i className="bi bi-geo-alt"></i> {getRoomName(b.roomId)}</span>
                            </td>
                            <td>{new Date(b.date).toLocaleDateString('th-TH')}</td>
                            <td>{b.timeStart} - {b.timeEnd}</td>
                            <td className="pe-3 text-end">
                              <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                                {b.status === 'pending' && <><i className="bi bi-hourglass-split"></i> รออนุมัติ</>}
                                {b.status === 'approved' && <><i className="bi bi-check-circle"></i> อนุมัติแล้ว</>}
                                {b.status === 'cancelled' && <><i className="bi bi-x-circle"></i> ยกเลิก</>}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>
                ไม่มีประวัติการจองตามเงื่อนไขที่ระบุ
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <span className="text-muted" style={{ fontSize: '14px' }}>
                แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, tableData.length)} จาก {tableData.length} รายการ
              </span>
              <div className="btn-group">
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span className="btn btn-sm btn-light disabled">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
