// --- Handle Login Process ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const msgElement = document.getElementById("auth-msg");

  msgElement.className = "message";
  msgElement.style.display = "none";

  try {
    // 🛠️ Fixed: Explicitly routing to the local Docker Express port
    const response = await fetch("http://localhost:3001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Authentication failed.");

    // Hide login panel and open registration desk instantly
    document.getElementById("auth-panel").classList.add("hidden");
    document.getElementById("registration-panel").classList.remove("hidden");

  } catch (err) {
    msgElement.textContent = err.message;
    msgElement.className = "message error";
    msgElement.style.display = "block";
  }
});

// --- Handle Patient Registration ---
document.getElementById("registration-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const regMsg = document.getElementById("reg-msg");
  regMsg.style.display = "none";

  const payload = {
    firstName: document.getElementById("reg-firstName").value,
    lastName: document.getElementById("reg-lastName").value,
    dateOfBirth: document.getElementById("reg-dob").value,
    genderId: parseInt(document.getElementById("reg-genderId").value),
    email: document.getElementById("reg-email").value,
    phone: document.getElementById("reg-phone").value,
    addressLine1: document.getElementById("reg-address1").value,
    city: document.getElementById("reg-city").value,
    state: document.getElementById("reg-state").value,
    postalCode: document.getElementById("reg-postal").value,
    country: document.getElementById("reg-country").value,
    insuranceProvider: document.getElementById("reg-provider").value,
    insuranceMemberId: document.getElementById("reg-insuranceId").value
  };

  try {
    // 🛠️ Fixed: Explicitly routing to the local Docker Express port
    const response = await fetch("http://localhost:3001/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed.");

    regMsg.textContent = `Success! Patient registered with System ID: ${data.patientId}`;
    regMsg.className = "message success";
    regMsg.style.display = "block";
    document.getElementById("registration-form").reset();

  } catch (err) {
    regMsg.textContent = err.message;
    regMsg.className = "message error";
    regMsg.style.display = "block";
  }
});

// --- Handle Logout ---
document.getElementById("logoutBtn").addEventListener("click", async () => {
  // 🛠️ Fixed: Explicitly routing to the local Docker Express port
  await fetch("http://localhost:3001/api/logout", { method: "POST" });
  document.getElementById("registration-panel").classList.add("hidden");
  document.getElementById("auth-panel").classList.remove("hidden");
  document.getElementById("login-form").reset();
  document.getElementById("auth-msg").style.display = "none";
});