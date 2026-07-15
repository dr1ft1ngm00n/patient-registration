const searchInput = document.getElementById("searchInput");
const resultsArea = document.getElementById("resultsArea");
const resultCount = document.getElementById("resultCount");

function renderTable(patients) {
  if (patients.length === 0) {
    resultsArea.innerHTML = `<div class="empty-state">No patients found.</div>`;
    return;
  }

  const rows = patients
    .map(
      (p) => `
      <tr>
        <td class="name-cell">${escapeHtml(p.firstName)} ${escapeHtml(p.lastName)}</td>
        <td>${p.age}</td>
        <td>${escapeHtml(p.gender || "\u2014")}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>#${p.id}</td>
      </tr>`
    )
    .join("");

  resultsArea.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Gender</th>
          <th>Email</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadPatients(query = "") {
  const url = query ? `/patients?q=${encodeURIComponent(query)}` : "/patients";

  try {
    const response = await fetch(url);

    if (response.status === 401) {
      window.location.href = "/staff.html";
      return;
    }

    const patients = await response.json();

    resultCount.textContent = `${patients.length} patient${patients.length === 1 ? "" : "s"}`;
    renderTable(patients);
  } catch (err) {
    resultsArea.innerHTML = `<div class="empty-state">Could not load patients. Check your connection.</div>`;
  }
}

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadPatients(searchInput.value.trim());
  }, 300);
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  window.location.href = "/staff.html";
});

loadPatients();