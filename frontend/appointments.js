// 🎯 Use absolute relative path '/api' to ensure Nginx proxy catches it regardless of page depth
const API_BASE_URL = '/api';

// helper function to retrieve active session header configurations
function getAuthHeaders() {
    const token = localStorage.getItem('sessionToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// 📅 Create/Schedule Appointment handler
document.getElementById('apptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rawPatientId = document.getElementById('patientId').value;
    const payload = {
        patientId: Number(rawPatientId), 
        doctorName: document.getElementById('doctorName').value,
        dateTime: document.getElementById('dateTime').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Appointment scheduled successfully!');
            loadAppointments();
            document.getElementById('apptForm').reset();
        } else {
            const err = await res.json();
            alert(`Error scheduling appointment: ${err.error || 'Request rejected by gateway.'}`);
        }
    } catch (networkError) {
        alert('Network connection failure. Unable to reach the clinical API server.');
    }
});

// 🔄 Read/Load scheduled appointments
async function loadAppointments() {
    try {
        const res = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!res.ok) {
            console.error('Unauthorized access to clinical record board.');
            return;
        }
        
        const appts = await res.json();
        const container = document.getElementById('apptList');
        
        if (!appts || appts.length === 0) {
            container.innerHTML = `<li class="appt-item"><div class="appt-meta">No clinical scheduling records found.</div></li>`;
            return;
        }

        container.innerHTML = appts.map(a => {
            const patientDisplayName = a.patient 
                ? `${a.patient.firstName} ${a.patient.lastName}` 
                : `Patient Record ID #${a.patientId}`;

            const formattedDate = new Date(a.dateTime).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short'
            });

            const currentStatus = a.status || 'SCHEDULED';

            return `
                <li class="appt-item">
                    <div class="appt-details">
                        <strong>🏥 ${patientDisplayName}</strong>
                        <span class="appt-meta">Clinician: ${a.doctorName} — ${formattedDate}</span>
                    </div>
                    <div>
                        <span class="status">${currentStatus}</span>
                    </div>
                </li>
            `;
        }).join('');
    } catch (err) {
        console.error('Could not load appointments list from backend engine:', err);
    }
}

// Automatically load clinical schedule on window initiation
loadAppointments();