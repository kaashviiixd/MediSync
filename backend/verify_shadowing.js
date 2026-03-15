import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Rajesh Sharma" } },
    include: { doctorProfile: true }
  });
  
  if (user) {
    console.log("User ID:", user.id);
    console.log("DoctorProfile ID:", user.doctorProfile?.id);
    console.log("DoctorProfile userId:", user.doctorProfile?.userId);
    
    const spread = { ...user, ...user.doctorProfile };
    console.log("Spread Resulting ID:", spread.id);
  }
}

main().finally(() => prisma.$disconnect());
