const GAS_URL = "https://script.google.com/macros/s/AKfycbwdrjXNlecgxwjALMYhVoePtA3wPa6i9izegG28EwpYio_uZlTVgZajaO7S6fxumK8M5g/exec"; 

const DB_KEYS = {
  USERS: 'srw_users',
  ROOMS: 'srw_rooms',
  BOOKINGS: 'srw_bookings',
  SESSION: 'srw_session'
};

const DEFAULT_USERS = [
  { id: 1, username: 'admin',    password: 'admin123', role: 'admin',   fullname: 'ผู้ดูแลระบบ',         phone: '042-160-0010', department: 'กลุ่มงานบริหารทั่วไป' },
  { id: 2, username: 'teacher01', password: '1234',     role: 'teacher', fullname: 'นายสมชาย ใจดี',       phone: '081-234-5678', department: 'กลุ่มสาระการเรียนรู้ภาษาไทย' },
  { id: 3, username: 'teacher02', password: '1234',     role: 'teacher', fullname: 'นางสาวสุดา รักเรียน', phone: '089-876-5432', department: 'กลุ่มงานบริหารงานวิชาการ' },
  { id: 4, username: 'teacher03', password: '1234',     role: 'teacher', fullname: 'นายวีระ ตั้งใจสอน',   phone: '085-111-2222', department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์' },
  { id: 5, username: 'teacher04', password: '1234',     role: 'teacher', fullname: 'นางพรทิพย์ มากมี',     phone: '086-333-4444', department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี' },
  { id: 6, username: 'teacher05', password: '1234',     role: 'teacher', fullname: 'นายอนุชา แสนดี',       phone: '087-555-6666', department: 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ' }
];

const DEFAULT_ROOMS = [
  { id: 1, name: 'ห้องประชุมราชวิทยาคาร', building: 'อาคาร 1', floor: 'ชั้น 3', capacity: 60, color: '#1e40af', status: 'available' },
  { id: 2, name: 'ห้องประชุมเล็ก สกลนคร', building: 'อาคาร 1', floor: 'ชั้น 2', capacity: 20, color: '#b45309', status: 'available' },
  { id: 3, name: 'ห้องประชุมโสตทัศนศึกษา', building: 'อาคาร 2', floor: 'ชั้น 1', capacity: 100, color: '#15803d', status: 'available' },
  { id: 4, name: 'ห้องประชุมกลุ่มบริหารงานวิชาการ', building: 'อาคาร 3', floor: 'ชั้น 2', capacity: 15, color: '#6b21a8', status: 'maintenance' }
];

export function todayISO(offsetDays = 0){
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
}

function genDefaultBookings(){
  return [
    {
      id: 1,
      userId: 2,
      isExternal: false,
      bookerName: 'นายสมชาย ใจดี',
      phone: '081-234-5678',
      department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
      roomId: 1,
      topic: 'ประชุมกลุ่มสาระการเรียนรู้ภาษาไทยประจำเดือน เพื่อเตรียมการจัดการเรียนการสอนภาคเรียนที่ 1/2569 และการแบ่งกลุ่มสาระวิชา',
      date: todayISO(1),
      timeStart: '09:00',
      timeEnd: '12:00',
      equipment: 'โปรเจคเตอร์, ไมค์ 2 ตัว',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ];
}

export const DB = {
  async fetchGAS(action: string, payload: any = null) {
    if (!GAS_URL) return null;
    
    const bodyParams = new URLSearchParams();
    if (payload !== null) {
      bodyParams.append("payload", JSON.stringify(payload));
    }
    
    const opts = { 
      method: "POST", 
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString() 
    };
    
    const res = await fetch(`${GAS_URL}?action=${action}`, opts);
    const json = await res.json();
    if (json.status === "success") return json.data;
    throw new Error(json.message);
  },
  
  async syncData() {
    if (!GAS_URL) return;
    try {
      const [users, rooms, bookings] = await Promise.all([
        this.fetchGAS("getUsers"),
        this.fetchGAS("getRooms"),
        this.fetchGAS("getBookings")
      ]);
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(rooms));
      localStorage.setItem(DB_KEYS.BOOKINGS, JSON.stringify(bookings));
      
      // Notify the app that new data has been synced
      window.dispatchEvent(new Event('db-synced'));
    } catch(e) {
      console.error("Failed to sync from GAS:", e);
    }
  },

  async init(){
    const existingUsers = localStorage.getItem(DB_KEYS.USERS);
    if(!existingUsers || !existingUsers.includes("department")){
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if(!localStorage.getItem(DB_KEYS.ROOMS)){
      localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(DEFAULT_ROOMS));
    }
    if(!localStorage.getItem(DB_KEYS.BOOKINGS)){
      localStorage.setItem(DB_KEYS.BOOKINGS, JSON.stringify(genDefaultBookings()));
    }
    // Fire and forget, don't await so the app loads instantly
    this.syncData();
  },

  getUsers(){ 
    const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || "[]");
    return users.map((u: any) => ({ ...u, fullname: u.fullname || u.name || '' }));
  },
  
  getRooms(){ 
    const rooms = JSON.parse(localStorage.getItem(DB_KEYS.ROOMS) || "[]"); 
    return rooms.map((r: any) => ({ ...r, status: r.status || "available", building: r.building || '', floor: r.floor || '' }));
  },
  
  setRooms(rooms: any[]){ 
    localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(rooms)); 
  },
  
  getBookings(){ 
    const bookings = JSON.parse(localStorage.getItem(DB_KEYS.BOOKINGS) || "[]");
    const users = this.getUsers();
    return bookings.map((b: any) => {
      if (!b.isExternal && b.userId) {
        const u = users.find((user: any) => String(user.id) === String(b.userId));
        if (u) {
          b.department = u.department;
          b.bookerName = u.fullname || u.username;
          b.phone = u.phone;
        }
      }
      return b;
    });
  },
  
  setBookings(bookings: any[]){ 
    localStorage.setItem(DB_KEYS.BOOKINGS, JSON.stringify(bookings)); 
  },

  getSession(){ 
    const u = JSON.parse(localStorage.getItem(DB_KEYS.SESSION) || "null");
    if(u) u.fullname = u.fullname || u.name || '';
    return u;
  },
  
  setSession(user: any){ 
    localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user)); 
  },
  
  clearSession(){ 
    localStorage.removeItem(DB_KEYS.SESSION); 
  },

  async login(username: string, password: string){
    const normalizePhone = (p: string) => String(p || "").replace(/^0+/, "");
    const inputPhone = normalizePhone(password);

    if (GAS_URL) {
      try {
        const user = await this.fetchGAS("login", { username, password: inputPhone });
        if (user) { this.setSession(user); return user; }
      } catch (e) {
        console.error("GAS login failed:", e);
      }
      return null;
    }
    
    // Fallback: local localStorage
    const user = this.getUsers().find((u: any) =>
      u.username === username &&
      normalizePhone(u.phone) === inputPhone
    );
    if(user){ this.setSession(user); return user; }
    return null;
  },

  nextId(arr: any[]){
    return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
  },

  async addBooking(booking: any){
    booking.createdAt = new Date().toISOString();
    booking.status = "pending";
    if (GAS_URL) {
      try {
        const gasResult = await this.fetchGAS("addBooking", booking);
        if (gasResult && gasResult.id) booking.id = gasResult.id;
      } catch (e) {
        console.error("GAS addBooking failed:", e);
        booking.id = this.nextId(this.getBookings());
      }
    } else {
       booking.id = this.nextId(this.getBookings());
    }
    const bookings = this.getBookings();
    bookings.push(booking);
    this.setBookings(bookings);
    return booking;
  },

  async updateBooking(id: number, data: any){
    if (GAS_URL) {
      try {
        await this.fetchGAS("updateBooking", { id, ...data });
      } catch(e) {
        console.error("GAS updateBooking failed:", e);
      }
    }
    const bookings = this.getBookings();
    const idx = bookings.findIndex((b: any) => b.id === id);
    if(idx === -1) return null;
    bookings[idx] = { ...bookings[idx], ...data };
    this.setBookings(bookings);
    return bookings[idx];
  },

  async deleteBooking(id: number){
    if (GAS_URL) {
      try {
        await this.fetchGAS("deleteBooking", { id });
      } catch(e) {
         console.error("GAS deleteBooking failed:", e);
      }
    }
    const bookings = this.getBookings().filter((b: any) => b.id !== id);
    this.setBookings(bookings);
  },

  hasConflict(roomId: number, date: string, timeStart: string, timeEnd: string, excludeId: number | null = null){
    const bookings = this.getBookings();
    return bookings.some((b: any) => {
      if(b.id === excludeId) return false;
      if(b.status === "cancelled") return false;
      if(String(b.roomId) !== String(roomId) || b.date !== date) return false;
      return (timeStart < b.timeEnd && timeEnd > b.timeStart);
    });
  },

  hasPendingBooking(userId: number, excludeId: number | null = null){
    const bookings = this.getBookings();
    return bookings.some((b: any) => 
      String(b.userId) === String(userId) && 
      b.status === 'pending' && 
      b.id !== excludeId
    );
  },

  async addUser(userData: any) {
    if (GAS_URL) {
      try {
        const gasResult = await this.fetchGAS("addUser", userData);
        if (gasResult && gasResult.id) userData.id = gasResult.id;
      } catch (e) {
        console.error("GAS addUser failed:", e);
        userData.id = this.nextId(this.getUsers());
      }
    } else {
      userData.id = this.nextId(this.getUsers());
    }
    const users = this.getUsers();
    users.push(userData);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    return userData;
  },

  async updateUser(id: number | string, data: any) {
    if (GAS_URL) {
      try {
        await this.fetchGAS("updateUser", { id, ...data });
      } catch (e) {
        console.error("GAS updateUser failed:", e);
      }
    }
    const users = this.getUsers();
    const idx = users.findIndex((u: any) => String(u.id) === String(id));
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data };
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    return users[idx];
  },

  async deleteUser(id: number | string) {
    if (GAS_URL) {
      try {
        await this.fetchGAS("deleteUser", { id });
      } catch (e) {
        console.error("GAS deleteUser failed:", e);
      }
    }
    const users = this.getUsers().filter((u: any) => String(u.id) !== String(id));
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  },

  async addRoom(roomData: any) {
    if (GAS_URL) {
      try {
        const gasResult = await this.fetchGAS("addRoom", roomData);
        if (gasResult && gasResult.id) roomData.id = gasResult.id;
      } catch (e) {
        console.error("GAS addRoom failed:", e);
        roomData.id = this.nextId(this.getRooms());
      }
    } else {
      roomData.id = this.nextId(this.getRooms());
    }
    const rooms = this.getRooms();
    rooms.push(roomData);
    localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(rooms));
    return roomData;
  },

  async updateRoom(id: number | string, data: any) {
    if (GAS_URL) {
      try {
        await this.fetchGAS("updateRoom", { id, ...data });
      } catch (e) {
        console.error("GAS updateRoom failed:", e);
      }
    }
    const rooms = this.getRooms();
    const idx = rooms.findIndex((r: any) => String(r.id) === String(id));
    if (idx === -1) return null;
    rooms[idx] = { ...rooms[idx], ...data };
    localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(rooms));
    return rooms[idx];
  },

  async deleteRoom(id: number | string) {
    if (GAS_URL) {
      try {
        await this.fetchGAS("deleteRoom", { id });
      } catch (e) {
        console.error("GAS deleteRoom failed:", e);
      }
    }
    const rooms = this.getRooms().filter((r: any) => String(r.id) !== String(id));
    localStorage.setItem(DB_KEYS.ROOMS, JSON.stringify(rooms));
  }
};
