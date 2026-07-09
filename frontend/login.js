document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const msgElement = document.getElementById("auth-msg");

  // Reset UI message panel state
  msgElement.className = "message";
  msgElement.style.display = "none";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Authentication failed.");
    }

    // Success! Direct staff member to their workspace dashboard
    msgElement.textContent = "Login successful! Redirecting...";
    msgElement.className = "message success";
    msgElement.style.display = "block";

    setTimeout(() => {
      window.location.href = "/dashboard.html"; // Adjust to your platform's landing hub
    }, 1000);

  } catch (err) {
    msgElement.textContent = err.message;
    msgElement.className = "message error";
    msgElement.style.display = "block";
  }
});