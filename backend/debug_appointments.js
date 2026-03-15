import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: { select: { name: true } },
      doctor: { select: { name: true } }
    }
  });
  
  console.log("--- APPOINTMENTS ---");
  appointments.forEach(a => {
    console.log(`ID: ${a.id} | Doctor: ${a.doctor?.name} (ID: ${a.doctorId}) | Patient: ${a.patient?.name} (ID: ${a.patientId})`);
  });

  const users = await prisma.user.findMany({
    where: { role: 'doctor' },
    select: { id: true, name: true, email: true }
  });
  console.log("\n--- DOCTORS ---");
  users.forEach(u => {
    console.log(`Name: ${u.name} | ID: ${u.id} | Email: ${u.email}`);
  });
}

main().finally(() => prisma.$disconnect());
