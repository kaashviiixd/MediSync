import { PrismaClient } from '@prisma/client';
import { doctors } from '../data/doctors.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  try {
    console.log('Seeding data to MySQL...');

    // Seed Doctors
    for (const doc of doctors) {
      const hashedPassword = await bcrypt.hash(doc.password || 'password123', 10);
      
      const user = await prisma.user.upsert({
        where: { email: `${doc.username}@medisync.com` },
        update: {},
        create: {
          name: doc.name,
          email: `${doc.username}@medisync.com`,
          password: hashedPassword,
          role: 'doctor',
          profile_photo: doc.profile_image,
          doctorProfile: {
            create: {
              specialization: doc.specialization,
              degree: doc.degree,
              hospital: "MediSync General Hospital",
              experience: 10,
              consultation_fee: doc.fees || 500,
              available_slots: JSON.stringify(doc.available_slots),
            }
          }
        }
      });
    }
    console.log('Doctors seeded!');

    // Seed Users from users.json if exists
    const usersPath = path.join(__dirname, '../data/users.json');
    if (fs.existsSync(usersPath)) {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
      for (const u of usersData) {
        if (!u.email) continue;
        const hashedPassword = await bcrypt.hash(u.password || 'password123', 10);
        
        await prisma.user.upsert({
          where: { email: u.email },
          update: {},
          create: {
            name: u.name || 'Patient',
            email: u.email,
            password: hashedPassword,
            role: u.role || 'patient',
            profile_photo: u.photoURL,
            phone: u.phoneNumber
          }
        });
      }
      console.log('Users seeded!');
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
