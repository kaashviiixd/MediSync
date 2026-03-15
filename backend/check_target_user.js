import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const targetId = "RApGUhptnmWeZF4IHSFEyRnkta33";
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  
  console.log(`Checking for user ID ${targetId}:`, user ? "FOUND" : "NOT FOUND");
  
  if (!user) {
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true, role: true, email: true } });
    console.log("\nActual users in DB:");
    console.log(JSON.stringify(allUsers, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
