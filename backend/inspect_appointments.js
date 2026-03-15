import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const doctor = await prisma.user.findFirst({
    where: { name: { contains: "Rajesh Sharma" } }
  });

  if (!doctor) {
    console.log("Dr. Rajesh Sharma not found!");
    return;
  }

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id }
  });

  console.log(`Appointments for ${doctor.name}:`);
  appointments.forEach(app => {
    console.log(`Date: ${app.appointment_date}, Time: ${app.appointment_time}, Status: ${app.status}`);
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
