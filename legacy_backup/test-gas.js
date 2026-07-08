const GAS_URL = "https://script.google.com/macros/s/AKfycbwdrjXNlecgxwjALMYhVoePtA3wPa6i9izegG28EwpYio_uZlTVgZajaO7S6fxumK8M5g/exec";

async function run() {
  console.log("Testing POST addUser");
  try {
    const payload = { 
      username: "testuser99", 
      fullname: "Test User", 
      phone: "0123456789", 
      department: "Test Dept", 
      role: "teacher" 
    };
    const res = await fetch(`${GAS_URL}?action=addUser`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("Response HTTP Status:", res.status);
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();
