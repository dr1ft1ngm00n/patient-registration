const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { patientSchema } = require('./validation'); // Paths to your Zod gateway validations

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// 🔒 1. Enable Secure Cross-Origin Resource Sharing
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allows frontend container access
    credentials: true
}));

// 📦 2. Body Parser Middleware
app.use(express.json());

// --- 🔑 Authentication Endpoints ---

// Simple mock login endpoint for testing authentication desk entry
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required fields." });
        }

        // Mock authentication check (Replace with real database checks/hashing if needed)
        if (email === "admin@hospital.com" && password === "admin123") {
            return res.json({ success: true, message: "Authentication successful." });
        } else {
            return res.status(401).json({ error: "Invalid email credentials or password." });
        }
    } catch (error) {
        return res.status(500).json({ error: "Internal server error occurred during authentication." });
    }
});

// Simple logout endpoint to clear session status
app.post('/api/logout', (req, res) => {
    return res.json({ success: true, message: "Logged out cleanly." });
});


// --- 🏥 Patient Registration Relational Endpoints ---

// POST: Create a new patient profile record
app.post('/api/patients', async (req, res) => {
    try {
        // Safe validation filtering via Zod schema rules
        const validatedData = patientSchema.parse(req.body);

        // Check if the assigned Gender ID exists in the master lookup table first
        const genderExists = await prisma.genderMaster.findUnique({
            where: { id: validatedData.genderId }
        });

        if (!genderExists) {
            return res.status(400).json({ error: "The provided Gender ID token does not match records in the master lookup table." });
        }

        // Persist records into standard PostgreSQL engine instance via Prisma
        const newPatient = await prisma.patient.create({
            data: {
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                dateOfBirth: new Date(validatedData.dateOfBirth),
                genderId: validatedData.genderId, // Maps integers directly to lookup keys
                email: validatedData.email,
                phone: validatedData.phone,
                addressLine1: validatedData.addressLine1,
                addressLine2: validatedData.addressLine2 || null,
                city: validatedData.city,
                state: validatedData.state,
                postalCode: validatedData.postalCode,
                country: validatedData.country,
                insuranceProvider: validatedData.insuranceProvider,
                insuranceMemberId: validatedData.insuranceMemberId
            }
        });

        return res.status(201).json({ 
            success: true, 
            message: "Patient profile registered successfully.", 
            patientId: newPatient.id 
        });

    } catch (error) {
        // Catch parsing validation layout mismatch errors thrown by Zod
        if (error.name === "ZodError") {
            return res.status(400).json({ 
                error: "Data schema validation failed.", 
                details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
            });
        }
        
        console.error("Database Transaction Error:", error);
        return res.status(500).json({ error: "Failed to write patient file to the PostgreSQL engine." });
    }
});

// GET: Retrieve patient directory records including relational lookups
app.get('/api/patients', async (req, res) => {
    try {
        const directory = await prisma.patient.findMany({
            include: {
                gender: true // Merges Master Gender textual strings directly into payload array logs
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return res.json(directory);
    } catch (error) {
        console.error("Database Query Error:", error);
        return res.status(500).json({ error: "Failed to fetch files from patient directory." });
    }
});

// Start listening for inbound application traffic configurations
app.listen(PORT, () => {
    console.log(`🚀 Express network server engine online and listening on port http://localhost:${PORT}`);
});