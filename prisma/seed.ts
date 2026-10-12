import { PrismaClient, Role, ResourceStatus } from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean existing records (in reverse relation order)
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.resourceCategory.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@primewave.com",
      passwordHash: hashPassword("Admin@123"),
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Engineering Intern",
      email: "intern@primewave.com",
      passwordHash: hashPassword("Intern@123"),
      role: Role.USER,
    },
  });

  console.log(`✅ Created users: ${admin.email} (ADMIN), ${member.email} (USER)`);

  // 2. Create Categories
  const meetingRooms = await prisma.resourceCategory.create({
    data: {
      name: "Meeting & Conference Rooms",
      description: "Collaborative meeting spaces equipped with displays and video conferencing.",
    },
  });

  const equipment = await prisma.resourceCategory.create({
    data: {
      name: "Hardware & Media Equipment",
      description: "Specialized engineering and multimedia equipment for shared project use.",
    },
  });

  const workstations = await prisma.resourceCategory.create({
    data: {
      name: "Dedicated Workstations & Labs",
      description: "High-performance compute stations and testing lab benches.",
    },
  });

  console.log("✅ Created resource categories.");

  // 3. Create Resources
  const r1 = await prisma.resource.create({
    data: {
      name: "Executive Boardroom (Room 301)",
      description: "Seats 16 people. Equipped with 4K interactive display, Polycom video bar, and whiteboard.",
      location: "Building A - Floor 3",
      capacity: 16,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true, // High-demand room requires admin signoff
      categoryId: meetingRooms.id,
    },
  });

  const r2 = await prisma.resource.create({
    data: {
      name: "Agile Discussion Pod B",
      description: "Quick standup and huddle room for small teams with magnetic whiteboard.",
      location: "Building A - Floor 2",
      capacity: 6,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: meetingRooms.id,
    },
  });

  const r3 = await prisma.resource.create({
    data: {
      name: "4K Cinema Camera Kit (Sony FX3)",
      description: "Complete rig with 24-70mm f/2.8 lens, wireless microphones, and tripod.",
      location: "Media Lab Cabinet #4",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      categoryId: equipment.id,
    },
  });

  const r4 = await prisma.resource.create({
    data: {
      name: "Oculus Quest Pro Development Rig",
      description: "VR test station with high-spec GPU workstation for spatial computing tests.",
      location: "Innovation Lab - Station 5",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: workstations.id,
    },
  });

  console.log(`✅ Created resources: ${[r1.name, r2.name, r3.name, r4.name].join(", ")}`);
  console.log("🌱 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
