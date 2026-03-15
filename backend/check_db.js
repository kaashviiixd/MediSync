import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("--- Users ---");
    const users = await prisma.user.findMany({
      include: { doctorProfile: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log("\n--- Appointments ---");
    const appointments = await prisma.appointment.findMany();
    console.log(JSON.stringify(appointments, null, 2));
  } catch (err) {
    console.error("Diagnostic Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
