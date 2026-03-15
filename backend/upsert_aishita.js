import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const email = "aishita38@gmail.com";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      id: "1773385540743",
      name: "Ishita Agarwal",
      email: email,
      password: hashedPassword,
      role: 'patient'
    }
  });
  
  console.log(`Successfully created/updated user: ${user.email}`);
}

main()
  .catch(e => console.error("Create/Update Error:", e))
  .finally(() => prisma.$disconnect());
