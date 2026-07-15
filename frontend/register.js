const form = document.getElementById("registrationForm");
const statusBanner = document.getElementById("statusBanner");
const submitButton = document.getElementById("submitButton");

// Human-readable labels for error messages
const fieldLabels = {
  firstName: "First name",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  email: "Email",
  phone: "Phone number",
  addressLine1: "Address line 1",
  city: "City",
  state: "State / Province",
  postalCode: "Postal code",
  country: "Country",
  insuranceProvider: "Insurance provider",
  insuranceMemberId: "Member ID",
};

// --- Updated API Base ---
const API_BASE_URL = "/api"; 

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll("input.invalid").forEach((el) => el.classList.remove("invalid"));
}

function showFieldErrors(details) {
  Object.entries(details).forEach(([field, messages]) => {
    const errorEl = document.querySelector(`[data-error-for="${field}"]`);
    const inputEl = document.getElementById(field);
    if (errorEl) errorEl.textContent = messages[0];
    if (inputEl) inputEl.classList.add("invalid");
  });
}

function showBanner(type, title, message) {
  statusBanner.className = `status-banner show ${type}`;
  statusBanner.innerHTML = `<strong>${title}</strong>${message}`;
}

function hideBanner() {
  statusBanner.className = "status-banner";
  statusBanner.innerHTML = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors();
  hideBanner();

  submitButton.disabled = true;
  submitButton.textContent = "Submitting…";

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    // --- Updated Fetch call with API_BASE_URL ---
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await response.json();

    if (response.ok) {
      showBanner(
        "success",
        "You're registered.",
        `A confirmation has been recorded under reference #${body.patientId || 'N/A'}.`
      );
      form.reset();
      document
        .querySelectorAll(".progress-segment")
        .forEach((seg) => seg.classList.add("active"));
    } else if (body.details) {
      showFieldErrors(body.details);
      showBanner(
        "error",
        "A few fields need a second look.",
        "Check the highlighted fields above and try again."
      );
    } else {
      showBanner("error", "We couldn't complete this registration.", body.error || "Please try again.");
    }
  } catch (err) {
    showBanner("error", "Connection problem.", "Check your connection and try again.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Complete registration";
  }
});

const sections = document.querySelectorAll("fieldset[data-section]");
const segments = document.querySelectorAll(".progress-segment");

function updateProgress() {
  sections.forEach((section, index) => {
    const inputs = section.querySelectorAll("input[required]");
    const allFilled = Array.from(inputs).every((input) => input.value.trim() !== "");
    if (allFilled) {
      segments[index]?.classList.add("active");
    } else {
      segments[index]?.classList.remove("active");
    }
  });
}

form.addEventListener("input", updateProgress);