const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database master tables...');

  // Seed Gender Options
  await prisma.genderMaster.upsert({
    where: { name: 'Male' },
    update: {},
    create: { id: 1, name: 'Male' },
  });

  // Seed Role Options
  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { id: 1, name: 'ADMIN' },
  });

  await prisma.role.upsert({
    where: { name: 'RECEPTIONIST' },
    update: {},
    create: { id: 2, name: 'RECEPTIONIST' },
  });

  await prisma.role.upsert({
    where: { name: 'DOCTOR' },
    update: {},
    create: { id: 3, name: 'DOCTOR' },
  });

  await prisma.genderMaster.upsert({
    where: { name: 'Female' },
    update: {},
    create: { id: 2, name: 'Female' },
  });

  await prisma.genderMaster.upsert({
    where: { name: 'Other' },
    update: {},
    create: { id: 3, name: 'Other' },
  });

  // Seed Default Staff User Accounts
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      passwordHash: 'adminpassword',
      fullName: 'System Administrator',
      roleId: 1, // ADMIN
    },
  });

  await prisma.user.upsert({
    where: { email: 'receptionist@hospital.com' },
    update: {},
    create: {
      email: 'receptionist@hospital.com',
      passwordHash: 'password123',
      fullName: 'Default Receptionist',
      roleId: 2, // RECEPTIONIST
    },
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });