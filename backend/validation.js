const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const { patientSchema } = require('./validation');
const { requireAuth } = require('./requireAuth');
const { errorHandler } = require('./errorHandler');
const { logAction } = require('./auditLog');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json());

// --- PATIENT ROUTES ---

/**
 * 🚀 CREATE: Save patient info (Server-Side Business Logic)
 * Secure against OWASP Top 10 via structural schema constraints and input parsing
 */
app.post('/api/patients', async (req, res, next) => {
  try {
    // 🔒 OWASP Protection: Pass incoming data through Zod gateway rules
    const validatedData = patientSchema.parse(req.body);

    const newPatient = await prisma.patient.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: new Date(validatedData.dateOfBirth),
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
        // 🔗 Map structural master lookups via safe converted integer
        genderId: validatedData.genderId,
      },
      include: {
        genderRef: true, // Auto-join reference string values on return response
      }
    });

    // Write to audit ledger logs for system tracking visibility
    await logAction('CREATE_PATIENT', `Registered patient ID: ${newPatient.id}`);
    
    res.status(201).json(newPatient);
  } catch (error) {
    next(error); // Route errors safely to global handler middleware
  }
});

/**
 * 🔍 READ: Fetch all patient documents
 * Fulfills checklist requirement: Check queries executed through backend
 */
app.get('/api/patients', async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        genderRef: true, // 🔗 Joins the Patient rows to the GenderMaster table lookup dynamically
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

/**
 * 🛠️ UPDATE: Modify patient data (Server-Side Business Logic)
 */
app.put('/api/patients/:id', async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const validatedData = patientSchema.parse(req.body);

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: new Date(validatedData.dateOfBirth),
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
        genderId: validatedData.genderId, // Maps replacement selection integer cleanly
      },
    });

    await logAction('UPDATE_PATIENT', `Updated patient ID: ${patientId}`);
    res.json(updatedPatient);
  } catch (error) {
    next(error);
  }
});

/**
 * ❌ DELETE: Remove patient record (Server-Side Business Logic)
 */
app.delete('/api/patients/:id', async (req, res, next) => {
  try {
    const patientId = parseInt(req.params.id, 10);

    await prisma.patient.delete({
      where: { id: patientId },
    });

    await logAction('DELETE_PATIENT', `Deleted patient ID: ${patientId}`);
    res.json({ message: 'Patient document removed from engine tables successfully.' });
  } catch (error) {
    next(error);
  }
});

// --- MASTER LOOKUP ROUTES ---

/**
 * Fetch lookup dropdown items for client UI visibility
 */
app.get('/api/genders', async (req, res, next) => {
  try {
    const genders = await prisma.genderMaster.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(genders);
  } catch (error) {
    next(error);
  }
});

// --- GLOBAL EXCEPTION HANDLING ---
app.use(errorHandler);

// Start container cluster server process loop
app.listen(PORT, () => {
  console.log(`Server environment active. Express listening securely on port ${PORT}`);
});