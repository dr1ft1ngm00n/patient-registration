require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { patientSchema } = require("./validation");
const {
  findByEmail,
  createPatient,
  findById,
  createUser,
  findUserByEmail,
  searchPatients,
} = require("./db");
const { errorHandler } = require("./errorHandler");
const { logRegistrationEvent } = require("./auditLog");
const { calculateAge } = require("./ageCalculator");
const { requireAuth } = require("./requireAuth");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const {
  findByEmail,
  createPatient,
  findById,
  createUser,
  findUserByEmail,
  searchPatients,
  createAppointment,
  getAppointmentsByPatient,
  updateAppointmentStatus,
  getAllAppointments,
  createBill,
  getBillsByPatient,
  updateBillStatus,
  getAllBills,
  getGenderMaster,
} = require("./db");

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: "http://localhost:3000",
}));
app.use(morgan("dev"));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
  },
}));

app.use(express.static("public"));

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many registration attempts. Please try again later." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
});

app.get("/", (req, res) => {
  res.redirect("/index.html");
});

app.post("/register", registrationLimiter, async (req, res) => {
  const result = patientSchema.safeParse(req.body);

  if (!result.success) {
    logRegistrationEvent("VALIDATION_FAILURE", { ip: req.ip });
    return res.status(400).json({
      error: "Invalid registration data",
      details: result.error.flatten().fieldErrors,
    });
  }

  const data = result.data;

  const existing = await findByEmail(data.email);
  if (existing) {
    logRegistrationEvent("DUPLICATE_ATTEMPT", { email: data.email, ip: req.ip });
    return res.status(400).json({
      error: "We were unable to complete this registration. Please contact support if you believe this is an error.",
    });
  }

  const patient = await createPatient(data);
  logRegistrationEvent("REGISTRATION_SUCCESS", { email: data.email, ip: req.ip });

  res.status(201).json({
    message: "Registration successful",
    patientId: patient.id,
  });
});

app.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (err) {
    next(err);
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out. Please try again." });
    }
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  res.json({ userId: req.session.userId, role: req.session.role });
});

app.get("/patients", requireAuth, async (req, res, next) => {
  try {
    const results = await searchPatients(req.query.q);

    const safeResults = results.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      age: calculateAge(p.dateOfBirth),
      gender: p.gender,
      email: p.email,
    }));

    res.json(safeResults);
  } catch (err) {
    next(err);
  }
});

app.get("/patients/:id", requireAuth, async (req, res) => {
  const patient = await findById(req.params.id);

  if (!patient) {
    return res.status(404).json({ error: "Patient not found" });
  }

  res.json({
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    age: calculateAge(patient.dateOfBirth),
    gender: patient.gender,
  });
});

app.post("/users", async (req, res, next) => {
  try {
    const { email, password, role, fullName } = req.body;

    if (!email || !password || !role || !fullName) {
      return res.status(400).json({ error: "email, password, role, and fullName are all required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const user = await createUser({ email, password, role, fullName });

    res.status(201).json({
      message: "User created",
      userId: user.id,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
});

// --- Gender Master ---
app.get("/gender-master", async (req, res, next) => {
  try {
    const genders = await getGenderMaster();
    res.json(genders);
  } catch (err) {
    next(err);
  }
});

// --- Appointments ---
app.post("/appointments", requireAuth, async (req, res, next) => {
  try {
    const { patientId, doctorName, dateTime } = req.body;
    if (!patientId || !doctorName || !dateTime) {
      return res.status(400).json({ error: "patientId, doctorName and dateTime are required" });
    }
    const appointment = await createAppointment({ patientId, doctorName, dateTime });
    res.status(201).json({ message: "Appointment created", appointment });
  } catch (err) {
    next(err);
  }
});

app.get("/appointments", requireAuth, async (req, res, next) => {
  try {
    const appointments = await getAllAppointments();
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

app.get("/appointments/patient/:patientId", requireAuth, async (req, res, next) => {
  try {
    const appointments = await getAppointmentsByPatient(req.params.patientId);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

app.patch("/appointments/:id/status", requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["SCHEDULED", "COMPLETED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const appointment = await updateAppointmentStatus(req.params.id, status);
    res.json({ message: "Status updated", appointment });
  } catch (err) {
    next(err);
  }
});

// --- Billing ---
app.post("/bills", requireAuth, async (req, res, next) => {
  try {
    const { patientId, appointmentId, serviceDescription, amount } = req.body;
    if (!patientId || !serviceDescription || !amount) {
      return res.status(400).json({ error: "patientId, serviceDescription and amount are required" });
    }
    const bill = await createBill({ patientId, appointmentId, serviceDescription, amount });
    res.status(201).json({ message: "Bill created", bill });
  } catch (err) {
    next(err);
  }
});

app.get("/bills", requireAuth, async (req, res, next) => {
  try {
    const bills = await getAllBills();
    res.json(bills);
  } catch (err) {
    next(err);
  }
});

app.get("/bills/patient/:patientId", requireAuth, async (req, res, next) => {
  try {
    const bills = await getBillsByPatient(req.params.patientId);
    res.json(bills);
  } catch (err) {
    next(err);
  }
});

app.patch("/bills/:id/status", requireAuth, async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    if (!["PENDING", "PAID", "CANCELLED"].includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }
    const bill = await updateBillStatus(req.params.id, paymentStatus);
    res.json({ message: "Payment status updated", bill });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});