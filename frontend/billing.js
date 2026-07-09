document.getElementById('billForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        patientId: document.getElementById('patientId').value,
        serviceDescription: document.getElementById('serviceDescription').value,
        amount: parseFloat(document.getElementById('amount').value)
    };

    const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert('Invoice generated successfully!');
        loadBills();
        document.getElementById('billForm').reset();
    } else {
        alert('Failed to generate invoice.');
    }
});

async function loadBills() {
    const res = await fetch('/api/bills');
    if (!res.ok) return;
    const bills = await res.json();
    const container = document.getElementById('billEntries');
    container.innerHTML = bills.map(b => `
        <tr>
            <td><strong>${b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : `ID: ${b.patientId}`}</strong></td>
            <td>${b.serviceDescription}</td>
            <td>$${Number(b.amount).toFixed(2)}</td>
            <td>
                <button class="status-btn" onclick="toggleBillStatus(${b.id}, '${b.paymentStatus}')">
                    ${b.paymentStatus === 'PAID' ? '✅ PAID' : '❌ UNPAID'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleBillStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    await fetch(`/api/bills/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus })
    });
    loadBills();
}

loadBills();