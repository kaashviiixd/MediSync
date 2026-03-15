import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.user.findMany({
    where: { name: { contains: "Rajesh Sharma" } },
    include: { doctorProfile: true }
  });

  console.log("Found Doctors:");
  doctors.forEach(doc => {
    console.log(`ID: ${doc.id}, Name: ${doc.name}, Role: ${doc.role}`);
    console.log(`Profile ID: ${doc.doctorProfile?.id}`);
    console.log(`Slots: ${doc.doctorProfile?.available_time_slots}`);
    console.log("-------------------");
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
