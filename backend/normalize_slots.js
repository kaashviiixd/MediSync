import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.doctorProfile.findMany();

  for (const doc of doctors) {
    let slots = [];
    try {
      slots = typeof doc.available_time_slots === 'string' 
        ? JSON.parse(doc.available_time_slots) 
        : (doc.available_time_slots || []);
    } catch (e) {
      console.error(`Error parsing slots for doctor ${doc.userId}`);
      continue;
    }

    const normalizedSlots = slots.map(slot => {
      // Normalize format "X:XX AM/PM" to "0X:XX AM/PM"
      const match = slot.match(/^(\d):(\d\d)\s(AM|PM)$/);
      if (match) {
        return `0${match[1]}:${match[2]} ${match[3]}`;
      }
      return slot;
    });

    // Special case for Dr. Rajesh Sharma: ensure he specifically has the new slots
    // We already know his ID from previous debugs or can search by User
    const user = await prisma.user.findUnique({
      where: { id: doc.userId }
    });

    if (user && user.name.includes("Rajesh Sharma")) {
      const rajeshSlots = ["10:00 AM", "12:30 PM", "05:00 PM", "06:00 PM", "06:30 PM", "07:00 PM"];
      await prisma.doctorProfile.update({
        where: { id: doc.id },
        data: { available_time_slots: JSON.stringify(rajeshSlots) }
      });
      console.log(`Updated Dr. Rajesh Sharma with normalized slots: ${JSON.stringify(rajeshSlots)}`);
    } else {
      await prisma.doctorProfile.update({
        where: { id: doc.id },
        data: { available_time_slots: JSON.stringify(normalizedSlots) }
      });
      console.log(`Normalized slots for ${user?.name || doc.userId}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
