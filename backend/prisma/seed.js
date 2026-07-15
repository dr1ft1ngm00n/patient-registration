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