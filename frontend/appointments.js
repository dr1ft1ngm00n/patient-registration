document.getElementById('apptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        patientId: document.getElementById('patientId').value,
        doctorName: document.getElementById('doctorName').value,
        dateTime: document.getElementById('dateTime').value
    };

    const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Appointment scheduled successfully!');
        loadAppointments();
        document.getElementById('apptForm').reset();
    } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
    }
});

async function loadAppointments() {
    const res = await fetch('/api/appointments');
    if (!res.ok) return;
    const appts = await res.json();
    const container = document.getElementById('apptList');
    container.innerHTML = appts.map(a => `
        <li class="appt-item">
            <div>
                <strong>${a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : `Patient #${a.patientId}`}</strong><br>
                <small style="color: var(--ink-soft)">With ${a.doctorName} — ${new Date(a.dateTime).toLocaleString()}</small>
            </div>
            <div>
                <span class="status">${a.status}</span>
            </div>
        </li>
    `).join('');
}

loadAppointments();