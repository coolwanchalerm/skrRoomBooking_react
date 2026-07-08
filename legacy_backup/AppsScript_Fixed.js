const ss = SpreadsheetApp.getActiveSpreadsheet();

// ==========================================
// 1. ฟังก์ชันตั้งค่าเริ่มต้น (รันครั้งแรกครั้งเดียว)
// ==========================================
function setupDatabase() {
  const sheets = [
    {
      name: "Users",
      headers: ["id", "username", "name", "role", "phone", "department"]
    },
    {
      name: "Rooms",
      headers: ["id", "name", "building", "floor", "capacity", "color", "status"]
    },
    {
      name: "Bookings",
      headers: ["id", "userId", "bookerName", "department", "phone", "roomId", "date", "timeStart", "timeEnd", "topic", "equipment", "status", "isExternal", "createdAt", "cancelReason"]
    }
  ];

  sheets.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
    }
    // ล้างข้อมูลเก่าและสร้างหัวตาราง
    sheet.clear();
    sheet.appendRow(s.headers);
    // ทำให้หัวตารางเป็นตัวหนา
    sheet.getRange(1, 1, 1, s.headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  });
  
  // เพิ่มผู้ใช้ตั้งต้น ถ้ายังไม่มี
  const userSheet = ss.getSheetByName("Users");
  if (userSheet.getLastRow() === 1) {
    userSheet.appendRow([1, "admin", "ผู้ดูแลระบบ", "admin", "0812345678", "ฝ่ายบริหาร"]);
    userSheet.appendRow([2, "teacher1", "ครูทดสอบ", "teacher", "0898765432", "กลุ่มสาระการเรียนรู้ภาษาไทย"]);
  }
  
  // เพิ่มห้องตั้งต้น ถ้ายังไม่มี
  const roomSheet = ss.getSheetByName("Rooms");
  if (roomSheet.getLastRow() === 1) {
    roomSheet.appendRow([1, "ห้องจิรยุทโธ", "อาคาร 1", "ชั้น 3", 50, "#4a7bb2", "available"]);
    roomSheet.appendRow([2, "ห้องโสตทัศนศึกษา", "อาคาร 2", "ชั้น 1", 120, "#d9a440", "available"]);
  }
}

// ==========================================
// 2. API Endpoints (รับคำขอจากหน้าเว็บ)
// ==========================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e.parameter.action;
    let result = {};

    // Helper: ตรวจสอบข้อมูล ป้องกัน Error Cannot read properties of undefined
    const parsePayload = () => {
      // 1. อ่านจาก e.parameter.payload (กรณีส่งแบบ x-www-form-urlencoded)
      if (e.parameter && e.parameter.payload) {
        return JSON.parse(e.parameter.payload);
      }
      // 2. อ่านจาก e.postData.contents (กรณีส่งแบบ text/plain เดิม)
      if (e.postData && e.postData.contents) {
        return JSON.parse(e.postData.contents);
      }
      throw new Error("ไม่มีข้อมูลส่งมา (postData/payload is empty) กรุณาตรวจสอบการเชื่อมต่อ");
    };

    if (action === "getUsers") {
      result = getTableData("Users");
    } 
    else if (action === "getRooms") {
      result = getTableData("Rooms");
    } 
    else if (action === "getBookings") {
      result = getTableData("Bookings");
    }
    else if (action === "login") {
      const data = parsePayload();
      result = login(data.username, data.password);
    }
    else if (action === "addBooking") {
      const data = parsePayload();
      result = addBooking(data);
    }
    else if (action === "updateBooking") {
      const data = parsePayload();
      result = updateBooking(data.id, data);
    }
    else if (action === "deleteBooking") {
      const data = parsePayload();
      result = deleteBooking(data.id);
    }
    else if (action === "addRoom") {
      const data = parsePayload();
      result = addRoom(data);
    }
    else if (action === "updateRoom") {
      const data = parsePayload();
      result = updateRoom(data.id, data);
    }
    else if (action === "deleteRoom") {
      const data = parsePayload();
      result = deleteRoom(data.id);
    }
    else if (action === "addUser") {
      const data = parsePayload();
      result = addUser(data);
    }
    else if (action === "updateUser") {
      const data = parsePayload();
      result = updateUser(data.id, data);
    }
    else if (action === "deleteUser") {
      const data = parsePayload();
      result = deleteUser(data.id);
    }
    else {
      throw new Error("ไม่พบ Action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 3. ฟังก์ชันจัดการข้อมูล (Database Operations)
// ==========================================

function getTableData(sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 
  
  const headers = data[0];
  const rows = [];
  
  const dateColumns = ["date", "createdAt"];
  const timeColumns = ["timeStart", "timeEnd"];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      let header = headers[j];
      
      if (header === 'อาคาร') header = 'building';
      if (header === 'ชั้น') header = 'floor';
      
      if (header === "equipment" && val) {
        try { val = JSON.parse(val); } catch(e) { val = []; }
      }
      else if (header === "id" || header === "roomId" || header === "userId" || header === "capacity") {
        val = Number(val);
      }
      else if (header === "isExternal") {
        val = (val === true || val === "true" || val === 1);
      }
      else if (dateColumns.includes(header) && val instanceof Date) {
        val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      else if (timeColumns.includes(header)) {
        if (val instanceof Date) {
          val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "HH:mm");
        } else if (typeof val === 'number') {
          const totalMinutes = Math.round(val * 24 * 60);
          const hh = String(Math.floor(totalMinutes / 60)).padStart(2,'0');
          const mm = String(totalMinutes % 60).padStart(2,'0');
          val = `${hh}:${mm}`;
        } else {
          val = String(val || ''); 
        }
      }
      if (val === null || val === undefined) val = '';
      obj[header] = val;
    }
    rows.push(obj);
  }
  return rows;
}

function login(username, passwordPhone) {
  const users = getTableData("Users");
  const normalizePhone = (p) => String(p).replace(/^0+/, '');
  const inputPhone = normalizePhone(passwordPhone);

  const user = users.find(u =>
    String(u.username).toLowerCase() === String(username).toLowerCase() &&
    normalizePhone(u.phone) === inputPhone
  );
  if (user) {
    return user;
  }
  const userByPass = users.find(u => 
    String(u.username).toLowerCase() === String(username).toLowerCase() && 
    String(u.password) === String(passwordPhone)
  );
  if (userByPass) {
    return userByPass;
  }
  throw new Error("ชื่อผู้ใช้หรือรหัสผ่าน (เบอร์โทรศัพท์) ไม่ถูกต้อง");
}

function addBooking(data) {
  const sheet = ss.getSheetByName("Bookings");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingData = getTableData("Bookings");
  let nextId = 1;
  if (existingData.length > 0) nextId = Math.max(...existingData.map(b => Number(b.id))) + 1;
  const newRow = [];
  headers.forEach(header => {
    if (header === "id") newRow.push(nextId);
    else if (header === "createdAt") newRow.push(new Date().toISOString());
    else if (header === "status") newRow.push("pending");
    else if (header === "equipment") newRow.push(JSON.stringify(data.equipment || []));
    else newRow.push(data[header] !== undefined ? data[header] : "");
  });
  sheet.appendRow(newRow);
  data.id = nextId;
  return data;
}

function updateBooking(id, data) {
  const sheet = ss.getSheetByName("Bookings");
  const tableData = sheet.getDataRange().getValues();
  const headers = tableData[0];
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) { 
      headers.forEach((header, colIndex) => {
        if (data[header] !== undefined) {
          let val = data[header];
          if (header === "equipment") val = JSON.stringify(val);
          sheet.getRange(i + 1, colIndex + 1).setValue(val);
        }
      });
      return { id: id, updated: true };
    }
  }
  throw new Error("ไม่พบข้อมูลการจองนี้");
}

function deleteBooking(id) {
  const sheet = ss.getSheetByName("Bookings");
  const tableData = sheet.getDataRange().getValues();
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  throw new Error("ไม่พบข้อมูลการจองนี้");
}

function addRoom(data) {
  const sheet = ss.getSheetByName("Rooms");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingData = getTableData("Rooms");
  let nextId = 1;
  if (existingData.length > 0) nextId = Math.max(...existingData.map(r => Number(r.id))) + 1;
  const newRow = [];
  headers.forEach(origHeader => {
    let header = origHeader;
    if (header === 'อาคาร') header = 'building';
    if (header === 'ชั้น') header = 'floor';
    if (header === "id") newRow.push(nextId);
    else newRow.push(data[header] !== undefined ? data[header] : "");
  });
  sheet.appendRow(newRow);
  data.id = nextId;
  return data;
}

function updateRoom(id, data) {
  const sheet = ss.getSheetByName("Rooms");
  const tableData = sheet.getDataRange().getValues();
  const headers = tableData[0];
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) {
      headers.forEach((origHeader, colIndex) => {
        let header = origHeader;
        if (header === 'อาคาร') header = 'building';
        if (header === 'ชั้น') header = 'floor';
        if (data[header] !== undefined) {
          sheet.getRange(i + 1, colIndex + 1).setValue(data[header]);
        }
      });
      return { id: id, updated: true };
    }
  }
  throw new Error("ไม่พบข้อมูลห้องนี้");
}

function deleteRoom(id) {
  const sheet = ss.getSheetByName("Rooms");
  const tableData = sheet.getDataRange().getValues();
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  throw new Error("ไม่พบข้อมูลห้องนี้");
}

function addUser(data) {
  const sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("ไม่พบชีต Users");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingData = getTableData("Users");
  let nextId = 1;
  if (existingData.length > 0) nextId = Math.max(...existingData.map(u => Number(u.id))) + 1;
  const newRow = [];
  headers.forEach(header => {
    let val = data[header];
    if (header === "id") val = nextId;
    if (header === "name" && data.fullname) val = data.fullname;
    newRow.push(val !== undefined ? val : "");
  });
  sheet.appendRow(newRow);
  data.id = nextId;
  return data;
}

function updateUser(id, data) {
  const sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("ไม่พบชีต Users");
  const tableData = sheet.getDataRange().getValues();
  const headers = tableData[0];
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) {
      headers.forEach((header, colIndex) => {
        let val = data[header];
        if (header === "name" && data.fullname !== undefined) val = data.fullname;
        if (val !== undefined) {
          sheet.getRange(i + 1, colIndex + 1).setValue(val);
        }
      });
      return { id: id, updated: true };
    }
  }
  throw new Error("ไม่พบข้อมูลสมาชิกนี้");
}

function deleteUser(id) {
  const sheet = ss.getSheetByName("Users");
  if (!sheet) throw new Error("ไม่พบชีต Users");
  const tableData = sheet.getDataRange().getValues();
  for (let i = 1; i < tableData.length; i++) {
    if (Number(tableData[i][0]) === Number(id)) {
      sheet.deleteRow(i + 1);
      return { id: id, deleted: true };
    }
  }
  throw new Error("ไม่พบข้อมูลสมาชิกนี้");
}
