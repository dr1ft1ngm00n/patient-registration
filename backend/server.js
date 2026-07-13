const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { patientSchema } = require('./validation');
const { errorHandler } = require('./errorHandler');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Global Middleware Configuration
app.use(cors({ origin: 'http://localhost:3000' })); // Permits smooth connection from our frontend interface
app.use(express.json());

/**
 * 💾 Patient Registration API Endpoint
 * Accepts human-readable gender strings, resolves relationship mappings, and saves records.
 */
app.post('/api/register', async (req, res, next) => {
    try {
        // 1. Structural evaluation via Zod gateway engine
        const validatedData = patientSchema.parse(req.body);

        // 2. Resolve human-readable text labels into database relational primary keys
        const genderRecord = await prisma.genderMaster.findFirst({
            where: {
                name: {
                    equals: validatedData.gender,
                    mode: 'insensitive' // Overrides upper/lower text casting mismatches
                }
            }
        });

        // Fail early if user selection is missing inside GenderMaster data table records
        if (!genderRecord) {
            return res.status(400).json({ 
                error: "The provided Gender label token does not match structural records in the master lookup table." 
            });
        }

        // 3. Complete database transaction layer execution
        const newPatient = await prisma.patient.create({
            data: {
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                dateOfBirth: new Date(validatedData.dateOfBirth), // Transforms text into clean schema date objects
                email: validatedData.email,
                phone: validatedData.phone,
                addressLine1: validatedData.addressLine1,
                addressLine2: validatedData.addressLine2,
                city: validatedData.city,
                state: validatedData.state,
                postalCode: validatedData.postalCode,
                country: validatedData.country,
                insuranceProvider: validatedData.insuranceProvider,
                insuranceMemberId: validatedData.insuranceMemberId,
                
                // Relational link connection directly using the resolved database index key
                genderId: genderRecord.id
            }
        });

        // Return successful database transaction entry receipt back up to the browser layout
        return res.status(201).json({ 
            success: true, 
            message: "Patient registered smoothly.",
            patientId: newPatient.id 
        });

    } catch (error) {
        // Forward sudden validations or internal crashes straight down to error handling middleware layers
        next(error);
    }
});

// Primary Server Status Verification Routing Entry
app.get('/', (req, res) => {
    res.send("🚀 Express network server engine online and listening on port 3001");
});

// Centralized Interception Error Handler Engine Setup
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server environment active. Express listening securely on port ${PORT}`);
    console.log(`🚀 Express network server engine online and listening on port http://localhost:3001`);
});

// Structural application cleanup protection routines
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});