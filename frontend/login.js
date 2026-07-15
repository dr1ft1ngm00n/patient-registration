/**
 * 🔐 Administrative Staff Authentication Controller
 * Manages secure communication with the backend validation engine.
 */
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const msgDiv = document.getElementById('auth-msg');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Clear out any previous alert configurations
    msgDiv.style.display = 'none';
    msgDiv.className = 'message';

    try {
        // Change this back to your local backend server
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
}       );

        const data = await response.json();

        if (response.ok) {
            msgDiv.className = 'message success';
            msgDiv.textContent = 'Access granted. Redirecting to registration desk...';
            msgDiv.style.display = 'block';
            
            // 🛡️ Lock in the temporary session authentication signature
            localStorage.setItem('sessionToken', data.token);

            // Forward the active window viewport smoothly to the registration layout
            setTimeout(() => {
                window.location.href = './index.html';
            }, 1000);
        } else {
            msgDiv.className = 'message error';
            msgDiv.textContent = data.error || 'Authentication rejected.';
            msgDiv.style.display = 'block';
        }

    } catch (err) {
        msgDiv.className = 'message error';
        msgDiv.textContent = 'Unable to establish a link to the authentication backend cluster.';
        msgDiv.style.display = 'block';
    }
});