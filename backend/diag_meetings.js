import prisma from './lib/prisma.js';

async function main() {
  try {
    console.log("Checking database tables...");
    const count = await prisma.meeting.count();
    console.log("SUCCESS: Meeting table exists. Count:", count);
  } catch (err) {
    console.error("FAILURE: Meeting table issue:", err.message);
    if (err.message.includes('does not exist')) {
      console.log("HINT: You might need to run npx prisma db push");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
