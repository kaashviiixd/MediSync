import prisma from './lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  try {
    console.log("MediSync Direct DB Test: Fetching available users...");
    const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
    const patient = await prisma.user.findFirst({ where: { role: 'patient' } });

    if (!doctor || !patient) {
      console.error("CRITICAL: Could not find both a doctor and a patient in the database.");
      process.exit(1);
    }

    console.log(`Using Doctor: ${doctor.name} (${doctor.id})`);
    console.log(`Using Patient: ${patient.name} (${patient.id})`);

    const roomId = `test-room-${uuidv4().substring(0, 8)}`;
    
    console.log("Attempting direct Prisma create for Meeting...");
    const meeting = await prisma.meeting.create({
      data: {
        roomId,
        doctorId: doctor.id,
        patientId: patient.id,
        status: 'active',
        started_at: new Date()
      }
    });

    console.log("SUCCESS: Meeting created directly in DB:", meeting.id);
    
    // Clean up
    await prisma.meeting.delete({ where: { id: meeting.id } });
    console.log("Cleaned up test meeting.");

  } catch (err) {
    console.error("DIRECT DB ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
