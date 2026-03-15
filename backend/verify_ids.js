import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const doctors = await prisma.user.findMany({ where: { role: 'doctor' } });
    const patients = await prisma.user.findMany({ where: { role: 'patient' } });
    
    console.log("--- Doctor IDs in DB ---");
    doctors.forEach(d => console.log(`${d.id} : ${d.name}`));
    
    console.log("\n--- Patient IDs in DB ---");
    patients.forEach(p => console.log(`${p.id} : ${p.name}`));

  } catch (err) {
    console.error("Query Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
