const { PrismaClient } = require("@prisma/client");
const { encrypt, decrypt } = require("./encryption");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// --- Cryptographic Helper ---
/**
 * Safely decrypts a patient record's insurance identifier.
 * If decryption fails (e.g., corrupted data or altered encryption key),
 * it flags the field gracefully rather than throwing a runtime crash.
 */
function decryptPatientData(patient) {
  if (!patient) return null;
  if (patient.insuranceMemberId) {
    try {
      patient.insuranceMemberId = decrypt(patient.insuranceMemberId);
    } catch (err) {
      console.error(`[SECURITY] Failed to decrypt insurance ID for patient ID ${patient.id}:`, err.message);
      patient.insuranceMemberId = "ERROR_DECRYPTION_FAILED";
    }
  }
  return patient;
}

// --- Patient Methods ---
async function findByEmail(email) {
  const patient = await prisma.patient.findUnique({ where: { email } });
  return decryptPatientData(patient);
}

async function findById(id) {
  const patient = await prisma.patient.findUnique({ where: { id: Number(id) } });
  return decryptPatientData(patient);
}

async function createPatient(data) {
  // Explicitly map properties and cast types to match schema.prisma expectations
  const newPatient = await prisma.patient.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: new Date(data.dateOfBirth), // Convert string input to Date object
      gender: data.gender || null,
      genderId: data.genderId ? Number(data.genderId) : null, // Safely cast to Int
      email: data.email,
      phone: data.phone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      insuranceProvider: data.insuranceProvider,
      insuranceMemberId: encrypt(data.insuranceMemberId), // Encrypt sensitive identifier
    },
  });
  return decryptPatientData(newPatient);
}

async function searchPatients(query) {
  let patients;
  
  if (!query) {
    patients = await prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } else {
    patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  return patients.map(decryptPatientData);
}

// --- Role Methods ---
async function getAllRoles() {
  return prisma.role.findMany({ orderBy: { id: 'asc' } });
}

async function findRoleByName(name) {
  return prisma.role.findUnique({ where: { name: name.toUpperCase() } });
}

// --- User Methods ---
async function createUser({ email, password, roleName, fullName }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Resolve the role record by name (e.g. 'RECEPTIONIST' -> id: 2)
  const roleRecord = await findRoleByName(roleName || 'RECEPTIONIST');
  if (!roleRecord) {
    throw new Error(`Role '${roleName}' not found in the database.`);
  }

  return prisma.user.create({
    data: { email, passwordHash, roleId: roleRecord.id, fullName },
    include: { role: true },
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
}

// --- Appointments ---
async function createAppointment({ patientId, doctorName, dateTime }) {
  return prisma.appointment.create({
    data: {
      patientId: Number(patientId),
      doctorName,
      dateTime: new Date(dateTime), // Convert string input to Date object
    },
  });
}

async function getAppointmentsByPatient(patientId) {
  return prisma.appointment.findMany({
    where: { patientId: Number(patientId) },
    orderBy: { dateTime: "asc" },
  });
}

async function updateAppointmentStatus(id, status) {
  return prisma.appointment.update({
    where: { id: Number(id) },
    data: { status },
  });
}

async function getAllAppointments() {
  return prisma.appointment.findMany({
    include: { patient: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { dateTime: "asc" },
  });
}

// --- Billing ---
async function createBill({ patientId, appointmentId, serviceDescription, amount }) {
  return prisma.bill.create({
    data: {
      patientId: Number(patientId),
      appointmentId: appointmentId ? Number(appointmentId) : null,
      serviceDescription,
      amount, // Prisma maps Decimals cleanly via string, number, or Decimal objects
    },
  });
}

async function getBillsByPatient(patientId) {
  return prisma.bill.findMany({
    where: { patientId: Number(patientId) },
    orderBy: { createdAt: "desc" },
  });
}

async function updateBillStatus(id, paymentStatus) {
  return prisma.bill.update({
    where: { id: Number(id) },
    data: { paymentStatus },
  });
}

async function getAllBills() {
  return prisma.bill.findMany({
    include: { patient: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// --- Gender Master ---
async function getGenderMaster() {
  return prisma.genderMaster.findMany({ orderBy: { id: "asc" } });
}

module.exports = {
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
  getAllRoles,
  findRoleByName,
};