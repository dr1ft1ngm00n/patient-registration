const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const db = require("./db");
const { patientSchema } = require("./validation");
const { encrypt } = require("./encryption");
const { requireAuth, authorizeRoles } = require("./requireAuth");
const { logRegistrationEvent } = require("./auditLog");
const { errorHandler } = require("./errorhandler");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Security Middleware & Header Hardening ---
app.use(helmet()); // Basic security headers

// Fine-tuned Content Security Policy (CSP) to unbreak CSS layout styling issues
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none';"
  );
  next();
});

app.use(express.json());

// --- Brute Force & Rate Limiting Gatekeepers ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Strict limit on auth checkpoints
  message: { error: "Too many authentication attempts. Please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Rate limit exceeded. Please throttle request frequencies." },
});

app.use("/api/", apiLimiter);

// --- Session Architecture Store ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-unsecure-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true when running under Nginx HTTPS
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 12, // 12 Hours session validity bound
    },
  })
);

// --- 1. System Authentication Routes ---

app.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await db.findUserByEmail(email);

    if (!user) {
      logRegistrationEvent("AUTH_FAILURE", { email, ip: req.ip });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const bcrypt = require("bcrypt");
    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      logRegistrationEvent("AUTH_FAILURE", { email, ip: req.ip });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Bind session parameters securely
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.fullName = user.fullName;

    res.json({ message: "Login successful", user: { email: user.email, role: user.role, fullName: user.fullName } });
  } catch (err) {
    next(err);
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out. Try again." });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
});

app.get("/me", requireAuth, (req, res) => {
  res.json({ userId: req.session.userId, role: req.session.role, fullName: req.session.fullName });
});

// Admin-only terminal endpoint to establish administrative accounts
app.post("/users", requireAuth, authorizeRoles(["ADMIN"]), async (req, res, next) => {
  try {
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required profile parameters." });
    }
    const existing = await db.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "User account email already exists." });

    const newUser = await db.createUser({ email, password, role, fullName });
    res.status(201).json({ message: "Staff account provisioned.", userId: newUser.id });
  } catch (err) {
    next(err);
  }
});


// --- 2. Patient Domain Operations ---

app.post("/patients", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST"]), async (req, res, next) => {
  try {
    const validation = patientSchema.safeParse(req.body);
    if (!validation.success) {
      logRegistrationEvent("VALIDATION_FAILURE", { email: req.body.email, ip: req.ip });
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const duplicate = await db.findByEmail(validation.data.email);
    if (duplicate) {
      logRegistrationEvent("DUPLICATE_ATTEMPT", { email: validation.data.email, ip: req.ip });
      return res.status(409).json({ error: "A patient with this email address is already registered." });
    }

    const patient = await db.createPatient(validation.data);
    logRegistrationEvent("REGISTRATION_SUCCESS", { email: patient.email, ip: req.ip });

    res.status(201).json({ message: "Patient registered successfully", patientId: patient.id });
  } catch (err) {
    next(err);
  }
});

/**
 * MISSING FEATURE IMPLEMENTATION: PUT /patients/:id
 * Allows authorized staff members to update historical patient records safely.
 */
app.put("/patients/:id", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST", "DOCTOR"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if target record exists prior to modification execution
    const targetPatient = await db.findById(id);
    if (!targetPatient) {
      return res.status(404).json({ error: "Patient profile not found." });
    }

    // Intercept payload via parsing rules
    const validation = patientSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    // Check for email collision changes
    if (validation.data.email !== targetPatient.email) {
      const emailCollisionCheck = await db.findByEmail(validation.data.email);
      if (emailCollisionCheck) {
        return res.status(409).json({ error: "Email address conflict. This email belongs to another profile." });
      }
    }

    // Execute atomic modification query pipeline 
    const updatedPatient = await db.prisma.patient.update({
      where: { id: Number(id) },
      data: {
        firstName: validation.data.firstName,
        lastName: validation.data.lastName,
        dateOfBirth: new Date(validation.data.dateOfBirth),
        gender: validation.data.gender || null,
        genderId: validation.data.genderId ? Number(validation.data.genderId) : null,
        email: validation.data.email,
        phone: validation.data.phone,
        addressLine1: validation.data.addressLine1,
        addressLine2: validation.data.addressLine2 || null,
        city: validation.data.city,
        state: validation.data.state,
        postalCode: validation.data.postalCode,
        country: validation.data.country,
        insuranceProvider: validation.data.insuranceProvider,
        insuranceMemberId: encrypt(validation.data.insuranceMemberId), // Re-encrypt new value securely
      },
    });

    res.json({ message: "Patient profile updated successfully", patientId: updatedPatient.id });
  } catch (err) {
    next(err);
  }
});

app.get("/patients", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST", "DOCTOR"]), async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await db.searchPatients(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

app.get("/patients/:id", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST", "DOCTOR"]), async (req, res, next) => {
  try {
    const patient = await db.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient profile not found." });
    res.json(patient);
  } catch (err) {
    next(err);
  }
});


// --- 3. Appointment Operations ---

app.post("/appointments", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST"]), async (req, res, next) => {
  try {
    const { patientId, doctorName, dateTime } = req.body;
    if (!patientId || !doctorName || !dateTime) {
      return res.status(400).json({ error: "Missing scheduling metadata." });
    }
    const appointment = await db.createAppointment({ patientId, doctorName, dateTime });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

app.get("/appointments", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST", "DOCTOR"]), async (req, res, next) => {
  try {
    const records = await db.getAllAppointments();
    res.json(records);
  } catch (err) {
    next(err);
  }
});

app.get("/appointments/patient/:patientId", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST", "DOCTOR"]), async (req, res, next) => {
  try {
    const records = await db.getAppointmentsByPatient(req.params.patientId);
    res.json(records);
  } catch (err) {
    next(err);
  }
});


// --- 4. Billing & Ledger Invoicing ---

app.post("/bills", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST"]), async (req, res, next) => {
  try {
    const { patientId, appointmentId, serviceDescription, amount } = req.body;
    if (!patientId || !serviceDescription || amount === undefined) {
      return res.status(400).json({ error: "Missing invoice parameters." });
    }
    const bill = await db.createBill({ patientId, appointmentId, serviceDescription, amount: parseFloat(amount) });
    res.status(201).json(bill);
  } catch (err) {
    next(err);
  }
});

app.get("/bills", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST"]), async (req, res, next) => {
  try {
    const ledger = await db.getAllBills();
    res.json(ledger);
  } catch (err) {
    next(err);
  }
});

app.patch("/bills/:id/status", requireAuth, authorizeRoles(["ADMIN", "RECEPTIONIST"]), async (req, res, next) => {
  try {
    const { paymentStatus } = req.body; // Expects "PAID" or "UNPAID"
    if (!paymentStatus) return res.status(400).json({ error: "Missing target transaction status." });

    const updatedBill = await db.updateBillStatus(req.params.id, paymentStatus);
    res.json(updatedBill);
  } catch (err) {
    next(err);
  }
});


// --- 5. Supporting Master Data Routes ---

app.get("/gender-master", requireAuth, async (req, res, next) => {
  try {
    const masterData = await db.getGenderMaster();
    res.json(masterData);
  } catch (err) {
    next(err);
  }
});


// --- Centralized Pipeline Boundary ---
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[SYSTEM] Core application cluster online and executing on port ${PORT}`);
});