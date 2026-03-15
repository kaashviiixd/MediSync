import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appts = await prisma.appointment.findMany({
    include: {
      patient: { select: { name: true, email: true } },
      doctor: { select: { name: true, email: true } }
    }
  });
  
  appts.forEach(a => {
    console.log(`APPT_ID: ${a.id}`);
    console.log(`  DOCTOR: ${a.doctor?.name} | EMAIL: ${a.doctor?.email} | ID: ${a.doctorId}`);
    console.log(`  PATIENT: ${a.patient?.name} | EMAIL: ${a.patient?.email} | ID: ${a.patientId}`);
    console.log(`  TIME: ${a.appointment_time} | DATE: ${a.appointment_date}`);
  });
}

main().finally(() => prisma.$disconnect());
