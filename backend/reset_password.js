import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const email = "aishita38@gmail.com";
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log(`Successfully updated password for ${email}`);
  console.log(`New Hash: ${hashedPassword}`);
}

main()
  .catch(e => console.error("Update Error:", e))
  .finally(() => prisma.$disconnect());
