// 🎯 Explicitly target the Express API gateway port running in your Docker container
const API_BASE_URL = 'http://localhost:3001/api/patients/api';

// Helper function to retrieve active session header configurations
function getAuthHeaders() {
    const token = localStorage.getItem('sessionToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// 💵 Generate Invoice handler
document.getElementById('billForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Normalize patientId to an integer to match the database schemas
    const rawPatientId = document.getElementById('patientId').value;
    const payload = {
        patientId: Number(rawPatientId),
        serviceDescription: document.getElementById('serviceDescription').value,
        amount: parseFloat(document.getElementById('amount').value)
    };

    try {
        const res = await fetch(`${API_BASE_URL}/bills`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Invoice generated successfully!');
            loadBills();
            document.getElementById('billForm').reset();
        } else {
            const err = await res.json();
            alert(`Failed to generate invoice: ${err.error || 'Request rejected by gateway.'}`);
        }
    } catch (networkError) {
        alert('Network connection failure. Unable to reach the billing API server.');
    }
});

// 🔄 Read/Load Outstanding Ledger Invoices
async function loadBills() {
    try {
        const res = await fetch(`${API_BASE_URL}/bills`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!res.ok) {
            console.error('Unauthorized access to financial records.');
            return;
        }
        
        const bills = await res.json();
        const container = document.getElementById('billEntries');
        
        if (!bills || bills.length === 0) {
            container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--ink-soft);">No invoice entries found.</td></tr>`;
            return;
        }

        container.innerHTML = bills.map(b => {
            // Safely fall back if patient relation database joins are not loaded
            const patientDisplayName = b.patient 
                ? `${b.patient.firstName} ${b.patient.lastName}` 
                : `Patient ID #${b.patientId}`;

            const isPaid = b.paymentStatus === 'PAID';

            return `
                <tr>
                    <td><strong>🏥 ${patientDisplayName}</strong></td>
                    <td>${b.serviceDescription}</td>
                    <td class="amount-highlight">$${Number(b.amount).toFixed(2)}</td>
                    <td>
                        ${isPaid ? `
                            <span class="status-paid">✅ Paid</span>
                        ` : `
                            <button class="status-btn" onclick="toggleBillStatus(${b.id}, '${b.paymentStatus}')">
                                ⏳ Unpaid (Mark Paid)
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Could not load financial records from backend:', err);
    }
}

// 🔄 Update / Patch Payment Status (OWASP A01: Broken Access Control Guard)
async function toggleBillStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    
    try {
        const res = await fetch(`${API_BASE_URL}/bills/${id}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ paymentStatus: nextStatus })
        });

        if (res.ok) {
            loadBills();
        } else {
            const err = await res.json();
            alert(`Authorization Error: Unable to update ledger entries. ${err.error || ''}`);
        }
    } catch (err) {
        alert('Network error trying to toggle payment status.');
    }
}

// Automatically load financial ledger on window initiation
loadBills();