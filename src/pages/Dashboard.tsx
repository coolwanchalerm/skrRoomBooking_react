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
        backgroundColor: stats.deptData.length ? ['#4a7bb2', '#d9a440', '#4ca983', '#db6964', '#9466c4', '#f1aeb5'] : ['#e0e0e0'],
        borderWidth: 0,
      }
    ]
  };

  const chartOptions = {
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
        <div>
          <h4 className="mb-1 text-navy font-display" style={{ fontWeight: 700 }}>
            ภาพรวมระบบจองห้องประชุม
          </h4>
          <p className="text-muted mb-0">ยินดีต้อนรับ, <span className="fw-semibold text-dark">{user?.fullname || user?.username}</span></p>
        </div>
        <div className="text-muted" style={{ fontSize: '14px' }}>
          <i className="bi bi-clock-history me-1"></i> ข้อมูลอัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')} น.
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

      {/* Filter Bar */}
      <div className="panel mb-3">
        <div className="panel-head flex-wrap gap-2">
          <h6><i className="bi bi-funnel-fill"></i> กรองข้อมูลแดชบอร์ด</h6>
          <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
            <select className="form-select form-select-sm" style={{ width: '110px' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">ทุกปี</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-select form-select-sm" style={{ width: '130px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
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
            <select className="form-select form-select-sm" style={{ width: '200px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">ทุกกลุ่มสาระ/ฝ่ายงาน</option>
              <option value="__external__">บุคคลภายนอก</option>
              {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn btn-sm btn-outline-secondary" onClick={resetFilters}><i className="bi bi-arrow-counterclockwise"></i> รีเซ็ต</button>
          </div>
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
                <Bar data={barChartData} options={chartOptions} />
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
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head flex-wrap gap-2">
          <h6><i className="bi bi-search"></i> ค้นหาประวัติการจอง</h6>
          <div className="d-flex flex-wrap gap-2">
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="ค้นหาชื่อ/หัวข้อ/ห้อง..." 
              style={{ width: '200px' }} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="form-select form-select-sm" 
              style={{ width: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติ</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </div>
        <div className="panel-body p-0">
          <div className="table-responsive" style={{ maxHeight: '400px' }}>
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>วันที่จอง</th>
                  <th>เวลา</th>
                  <th>ห้อง</th>
                  <th>หัวข้อ / สังกัดกลุ่มงาน</th>
                  <th>ผู้จอง</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((b: any) => (
                    <tr key={b.id}>
                      <td>{new Date(b.date).toLocaleDateString('th-TH')}</td>
                      <td>{b.timeStart} - {b.timeEnd}</td>
                      <td>{getRoomName(b.roomId)}</td>
                      <td>
                        <div className="font-weight-bold">{b.topic}</div>
                        <div className="text-muted" style={{fontSize: '12px'}}>{b.department}</div>
                      </td>
                      <td>{b.bookerName}</td>
                      <td>
                        {b.status === 'pending' && <span className="badge-status badge-pending"><i className="bi bi-hourglass-split"></i> รออนุมัติ</span>}
                        {b.status === 'approved' && <span className="badge-status badge-approved"><i className="bi bi-check-circle"></i> อนุมัติ</span>}
                        {b.status === 'cancelled' && <span className="badge-status badge-cancelled"><i className="bi bi-x-circle"></i> ยกเลิก</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted border-0">
                      ไม่มีรายการจอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
