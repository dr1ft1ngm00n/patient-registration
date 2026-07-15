const input = document.getElementById("patientIdInput");
const button = document.getElementById("lookupButton");
const statusBanner = document.getElementById("statusBanner");
const resultCard = document.getElementById("resultCard");

function showError(message) {
  resultCard.classList.remove("show");
  statusBanner.className = "status-banner show error";
  statusBanner.textContent = message;
}

function hideError() {
  statusBanner.className = "status-banner";
  statusBanner.textContent = "";
}

function showResult(patient) {
  hideError();
  document.getElementById("resultName").textContent = `${patient.firstName} ${patient.lastName}`;
  document.getElementById("resultId").textContent = patient.id;
  document.getElementById("resultAge").textContent = patient.age;
  document.getElementById("resultGender").textContent = patient.gender || "Not provided";
  resultCard.classList.add("show");
}

async function lookupPatient() {
  const id = input.value.trim();

  if (!id) {
    showError("Enter a patient ID first.");
    return;
  }

  try {
    const response = await fetch(`/patients/${id}`);
    const body = await response.json();

    if (response.ok) {
      showResult(body);
    } else {
      showError(body.error || "Patient not found.");
    }
  } catch (err) {
    showError("Could not reach the server. Check your connection.");
  }
}

button.addEventListener("click", lookupPatient);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") lookupPatient();
});