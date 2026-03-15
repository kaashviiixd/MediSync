import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("--- DOCTORS IN DB ---");
  const doctors = await prisma.user.findMany({
    where: { role: 'doctor' },
    select: { id: true, name: true, email: true }
  });
  console.log(JSON.stringify(doctors, null, 2));

  console.log("\n--- PATIENTS IN DB ---");
  const patients = await prisma.user.findMany({
    where: { role: 'patient' },
    select: { id: true, name: true, email: true }
  });
  console.log(JSON.stringify(patients, null, 2));

  console.log("\n--- ALL APPOINTMENTS ---");
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: { select: { name: true, email: true } },
      doctor: { select: { name: true, email: true } }
    }
  });
  console.log(JSON.stringify(appointments, null, 2));
}

main().finally(() => prisma.$disconnect());
