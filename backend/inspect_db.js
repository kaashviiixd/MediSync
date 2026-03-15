import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    where: {
      NOT: {
        patient_name: null
      }
    }
  });
  console.log(`Found ${appointments.length} appointments with patient_name:`);
  appointments.forEach(app => {
    console.log(`ID: ${app.id} | Name: ${app.patient_name} | Status: ${app.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
