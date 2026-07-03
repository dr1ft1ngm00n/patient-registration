const form = document.getElementById("loginForm");
const statusBanner = document.getElementById("statusBanner");
const loginButton = document.getElementById("loginButton");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  statusBanner.className = "status-banner";
  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await response.json();

    if (response.ok) {
      // Redirect to the staff patient list once logged in.
      window.location.href = "/patients.html";
    } else {
      statusBanner.textContent = body.error || "Login failed.";
      statusBanner.className = "status-banner show";
    }
  } catch (err) {
    statusBanner.textContent = "Could not reach the server.";
    statusBanner.className = "status-banner show";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
});