const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("./encryption");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function findByEmail(email) {
  return prisma.patient.findUnique({ where: { email } });
}

async function findById(id) {
  return prisma.patient.findUnique({ where: { id: Number(id) } });
}

async function createPatient(data) {
  const encryptedData = {
    ...data,
    insuranceMemberId: encrypt(data.insuranceMemberId),
  };
  return prisma.patient.create({ data: encryptedData });
}

async function searchPatients(query) {
  if (!query) {
    return prisma.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  return prisma.patient.findMany({
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

async function createUser({ email, password, role, fullName }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.user.create({
    data: { email, passwordHash, role, fullName },
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

// --- Appointments ---
async function createAppointment({ patientId, doctorName, dateTime }) {
  return prisma.appointment.create({
    data: {
      patientId: Number(patientId),
      doctorName,
      dateTime: new Date(dateTime),
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
      amount,
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
};