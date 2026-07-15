const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// Secret key for signing and verifying JWT Session Tokens (OWASP A07)
const JWT_SECRET = process.env.JWT_SECRET || 'clinical-portal-jwt-super-secret-key';

// =========================================================================
// 🛡️ GLOBAL MIDDLEWARE CONFIGURATION
// =========================================================================

// Configured to match secure local containers and cross-origin settings
a// Simplest and most robust approach for a proxied setup
app.use(cors({
    origin: '*', // Allows all origins; since Nginx controls access, this is safe
    credentials: true
}));

app.use(express.json());

// Session validation middleware checking for JSON Web Tokens (OWASP A01 / A07)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No active session token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Session expired or altered. Please re-authenticate.' });
        }
        req.user = user;
        next();
    });
}


// =========================================================================
// 🔑 USER AUTHENTICATION ENDPOINTS (Existing Core)
// =========================================================================

app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password fields are strictly required.' });
        }

        const newUser = await prisma.user.create({
            data: { 
                email, 
                passwordHash: password, // For safety, in production always hash passwords!
                role: 'RECEPTIONIST',   // Default fallback role
                fullName: `${firstName} ${lastName}`.trim()
            }
        });
        res.status(201).json({ message: 'User registered successfully!', userId: newUser.id });
    } catch (err) {
        res.status(400).json({ error: 'Registration failed. Email may already be in use.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.passwordHash !== password) { 
            return res.status(401).json({ error: 'Invalid clinical credentials provided.' });
        }

        // Generate a cryptographically signed Session Token valid for 2 hours
        const sessionToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ message: 'Authentication successful', sessionToken });
    } catch (err) {
        res.status(500).json({ error: 'Internal gateway authentication error.' });
    }
});


// =========================================================================
// 🏥 PATIENT ADMISSIONS ENDPOINTS
// =========================================================================

// 1. GET: Fetch all registered patients (Requires Session Token)
app.get('/api/patients', authenticateToken, async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                genderRef: true // Joins the genderMaster table to load Male/Female/Other names instead of IDs
            },
            orderBy: {
                createdAt: 'desc' // Shows newly registered patients first
            }
        });
        res.json(patients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve patient directories.' });
    }
});

// 2. POST: Admit a new patient (Requires Session Token)
// POST: Admit a new patient (Handles shared parent/guardian emails gracefully)
app.post('/api/patients', authenticateToken, async (req, res) => {
    const { 
        firstName, 
        lastName, 
        dob, 
        phone, 
        insuranceId, 
        addressLine1, 
        city, 
        state, 
        postalCode,
        email // 👈 Receive the email directly from the form body
    } = req.body;

    try {
        const parsedDob = new Date(dob);

        // 1. Check if a patient with the exact same Name + DOB already exists
        const existingPatient = await prisma.patient.findFirst({
            where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
                dateOfBirth: parsedDob
            }
        });

        if (existingPatient) {
            return res.status(400).json({ 
                error: `Admission rejected: A patient named "${firstName} ${lastName}" with Date of Birth (${dob}) is already registered in the system.` 
            });
        }

        // 2. If unique, proceed with creation (allowing shared emails!)
        const newPatient = await prisma.patient.create({
            data: {
                firstName,
                lastName,
                dateOfBirth: parsedDob,
                phone,
                insuranceProvider: 'Default Provider', 
                insuranceMemberId: insuranceId,
                // Fallback to a clinic email if no email was entered, otherwise use the parent's/shared email
                email: email ? email.trim().toLowerCase() : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@clinic.local`,
                genderId: 1, 
                addressLine1: addressLine1 || 'Temporary Intake Address',
                city: city || 'City',
                state: state || 'State',
                postalCode: postalCode || '00000',
                country: 'US'
            }
        });

        res.status(201).json(newPatient);
    } catch (err) {
        console.error("Admissions Error: ", err);
        res.status(500).json({ error: 'Failed to complete admission file processing.' });
    }
});


// =========================================================================
// 📅 APPOINTMENTS API ENDPOINTS (Connected Module)
// =========================================================================

// 1. GET: Fetch all scheduled appointments (Requires Session Token)
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            include: { patient: true }, // Joins patient relationship details
            orderBy: { dateTime: 'asc' }
        });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve appointments ledger.' });
    }
});

// 2. POST: Book a new appointment (Requires Session Token)
app.post('/api/appointments', authenticateToken, async (req, res) => {
    const { patientId, doctorName, dateTime } = req.body;
    try {
        const parsedPatientId = parseInt(patientId);
        if (isNaN(parsedPatientId)) {
            return res.status(400).json({ error: 'A valid numeric Patient ID is required.' });
        }

        const newAppt = await prisma.appointment.create({
            data: {
                patientId: parsedPatientId,
                doctorName,
                dateTime: new Date(dateTime),
                status: 'SCHEDULED'
            }
        });
        res.status(201).json(newAppt);
    } catch (err) {
        res.status(400).json({ error: 'Failed to schedule appointment. Verify patient ID reference exists in database.' });
    }
});


// =========================================================================
// 💵 BILLING & INVOICING API ENDPOINTS (Connected Module)
// =========================================================================

// 1. GET: Fetch all ledger invoices (Requires Session Token)
app.get('/api/bills', authenticateToken, async (req, res) => {
    try {
        const bills = await prisma.bill.findMany({
            include: { patient: true },
            orderBy: { id: 'desc' }
        });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve ledger invoices.' });
    }
});

// 2. POST: Generate a new invoice (Requires Session Token)
app.post('/api/bills', authenticateToken, async (req, res) => {
    const { patientId, serviceDescription, amount } = req.body;
    try {
        const parsedPatientId = parseInt(patientId);
        const parsedAmount = parseFloat(amount);

        if (isNaN(parsedPatientId) || isNaN(parsedAmount)) {
            return res.status(400).json({ error: 'Patient ID and Amount must be valid numeric parameters.' });
        }

        const newBill = await prisma.bill.create({
            data: {
                patientId: parsedPatientId,
                serviceDescription,
                amount: parsedAmount,
                paymentStatus: 'PENDING' // Defaults to PENDING status to match schema enums
            }
        });
        res.status(201).json(newBill);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Failed to generate invoice ledger record.' });
    }
});

// 3. PATCH: Toggle invoice payment status (Requires Session Token)
app.patch('/api/bills/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body; // Can be 'PENDING', 'PAID', or 'CANCELLED'
    try {
        const updatedBill = await prisma.bill.update({
            where: { id: parseInt(id) },
            data: { paymentStatus }
        });
        res.json(updatedBill);
    } catch (err) {
        res.status(400).json({ error: 'Failed to update transaction state. Record ID not found.' });
    }
});


// =========================================================================
// 🚀 SERVER INIT
// =========================================================================

app.listen(PORT, () => {
    console.log(`🏥 [HIS API GATEWAY RUNNING] on secure port http://localhost:${PORT}`);
});