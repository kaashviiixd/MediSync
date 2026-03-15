const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // or bcrypt, let's try bcrypt first

let bcryptLib;
try {
  bcryptLib = require('bcrypt');
} catch (e) {
  bcryptLib = require('bcryptjs');
}

const prisma = new PrismaClient();

async function main() {
  const email = 'testpatient@example.com';
  const password = 'password123';
  const hashedPassword = await bcryptLib.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
        password: hashedPassword,
        role: 'patient',
    },
    create: {
      name: 'Test Patient',
      email,
      password: hashedPassword,
      role: 'patient',
    },
  });

  console.log('SUCCESS_CREATED_PATIENT');
  console.log('Email:', user.email);
  console.log('Password:', password);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
