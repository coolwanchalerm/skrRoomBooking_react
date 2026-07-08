/**
 * นี่คือโค้ดสำหรับ Google Apps Script เพื่อรองรับฟีเจอร์ "จัดการสมาชิก" (เพิ่ม/แก้ไข/ลบ)
 * กรุณาคัดลอกโค้ดนี้ไปต่อท้ายไฟล์ Code.gs เดิมของคุณ หรือรวมเข้ากับฟังก์ชัน doPost(e) / doGet(e) ที่มีอยู่
 */

/* 
 ตัวอย่างการจัดการ doPost(e) 
 ถ้าคุณมี doPost() อยู่แล้ว ให้เอาบล็อก addUser, updateUser, deleteUser ไปใส่ใน Switch case หรือ if-else 
*/

function doPost(e) {
  // ค่าเบื้องต้น
  var action = e.parameter.action;
  var payload = e.postData ? JSON.parse(e.postData.contents) : {};

  // ตรวจสอบ Action ว่าตรงกับอะไร
  if (action === 'addUser') {
    return addUser(payload);
  }
  if (action === 'updateUser') {
    return updateUser(payload);
  }
  if (action === 'deleteUser') {
    return deleteUser(payload);
  }
  
  // ... Action อื่นๆ ของคุณที่มีอยู่แล้ว ...
}

/* 
=====================================================
ฟังก์ชันสำหรับระบบ User Management
=====================================================
- ชื่อ Sheet ที่ใช้เก็บข้อมูลผู้ใช้ จะต้องตรงกับที่คุณใช้อยู่ (ในที่นี้สมมติชื่อ "Users")
- โปรดปรับแก้ดัชนีคอลัมน์ (เช่น row[0], row[1]) ให้ตรงกับตาราง Google Sheet ของคุณ
*/

// ฟังก์ชันเพิ่มผู้ใช้ใหม่
function addUser(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users"); // ชื่อชีตผู้ใช้ของคุณ
    if (!sheet) throw new Error("ไม่พบชีต Users");
    
    // สร้าง ID ใหม่ (ใช้วันเวลา หรือจะรันเลขเองก็ได้)
    var newId = new Date().getTime().toString();
    
    // เรียงลำดับข้อมูลให้ตรงกับ Column ใน Sheet 
    // ตัวอย่าง: [ID, Username, Password, Role, Fullname, Phone, Department]
    var newRow = [
      newId,
      data.username || "",
      data.password || "",
      data.role || "teacher",
      data.fullname || "",
      data.phone || "",
      data.department || ""
    ];
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: { id: newId }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันแก้ไขข้อมูลผู้ใช้
function updateUser(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sheet) throw new Error("ไม่พบชีต Users");
    
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // สมมติว่า ID อยู่คอลัมน์ที่ 1 (Index 0)
    for (var i = 1; i < values.length; i++) {
      if (values[i][0].toString() === data.id.toString()) {
        rowIndex = i + 1; // getRange เริ่มที่ 1
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error("ไม่พบผู้ใช้งานนี้ในระบบ");
    }
    
    // อัปเดตข้อมูลทีละคอลัมน์ (ปรับเลขคอลัมน์ตาม Sheet จริงของคุณ)
    // ตัวอย่าง: คอลัมน์ 3=Password, 4=Role, 5=Fullname, 6=Phone, 7=Department
    if (data.password) sheet.getRange(rowIndex, 3).setValue(data.password);
    if (data.role) sheet.getRange(rowIndex, 4).setValue(data.role);
    if (data.fullname) sheet.getRange(rowIndex, 5).setValue(data.fullname);
    if (data.phone) sheet.getRange(rowIndex, 6).setValue(data.phone);
    if (data.department) sheet.getRange(rowIndex, 7).setValue(data.department);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันลบผู้ใช้
function deleteUser(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sheet) throw new Error("ไม่พบชีต Users");
    
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // ค้นหาแถวที่ ID ตรงกัน
    for (var i = 1; i < values.length; i++) {
      if (values[i][0].toString() === data.id.toString()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex);
    } else {
      throw new Error("ไม่พบข้อมูลที่จะลบ");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
