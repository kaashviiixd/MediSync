import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { doctors } from './data/doctors.js';

dotenv.config({ path: '../.env' });


const prisma = new PrismaClient();

async function main() {
  console.log('Seeding doctors into the database...');
  for (const doc of doctors) {
    const hashedPassword = await bcrypt.hash(doc.password || 'password123', 10);
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: doc.username } // we use username as email for login
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          name: doc.name,
          email: doc.username,
          password: hashedPassword,
          role: 'doctor',
          profile_photo: doc.profile_image,
          doctorProfile: {
            create: {
              specialization: doc.specialization,
              experience: 10,
              consultation_fee: doc.fees,
              available_time_slots: JSON.stringify(doc.available_slots)
            }
          }
        }
      });
      console.log(`Created doctor: ${doc.name}`);
    } else {
      console.log(`Doctor already exists: ${doc.name}`);
    }
  }
  console.log('Seeding finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
