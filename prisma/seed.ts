import { PrismaClient, Role, ResourceStatus, ReservationStatus } from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Starting database seed aligned with PrimeWave Lab Business Scenario...");

  // Clean existing records (in reverse relation order)
  await prisma.notification.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.resourceCategory.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Core Users from Business Context
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@primewave.com",
      passwordHash: hashPassword("Admin@123"),
      role: Role.ADMIN,
    },
  });

  const intern = await prisma.user.create({
    data: {
      name: "Engineering Intern",
      email: "intern@primewave.com",
      passwordHash: hashPassword("Intern@123"),
      role: Role.USER,
    },
  });

  const devUser = await prisma.user.create({
    data: {
      name: "Software Engineer",
      email: "dev@primewave.com",
      passwordHash: hashPassword("Dev@123"),
      role: Role.USER,
    },
  });

  const marketingUser = await prisma.user.create({
    data: {
      name: "Marketing Specialist",
      email: "marketing@primewave.com",
      passwordHash: hashPassword("Marketing@123"),
      role: Role.USER,
    },
  });

  console.log(`✅ Seeded users: ${admin.email} (ADMIN), ${intern.email} (USER), ${devUser.email}, ${marketingUser.email}`);

  // 2. Create the 5 Official Business Categories
  // Category 1: Meeting and conference rooms
  const meetingRoomsCat = await prisma.resourceCategory.create({
    data: {
      name: "Meeting & Conference Rooms",
      description: "Collaborative meeting spaces for sprint planning, stand-ups, client meetings, and executive reviews.",
    },
  });

  // Category 2: Media and production equipment
  const mediaEquipmentCat = await prisma.resourceCategory.create({
    data: {
      name: "Media & Production Equipment",
      description: "Professional audiovisual, 4K cinema cameras, lighting, and audio gear for product launches and media creation.",
    },
  });

  // Category 3: Technical and lab workstations
  const technicalWorkstationsCat = await prisma.resourceCategory.create({
    data: {
      name: "Technical & Lab Workstations",
      description: "Dedicated compute workstations, mobile testing racks, and automated QA testing benches.",
    },
  });

  // Category 4: Training and collaboration spaces
  const trainingSpacesCat = await prisma.resourceCategory.create({
    data: {
      name: "Training & Collaboration Spaces",
      description: "Large-capacity workshop spaces, innovation labs, and seminar rooms for employee training and team onboarding.",
    },
  });

  // Category 5: Shared IT and presentation equipment
  const itEquipmentCat = await prisma.resourceCategory.create({
    data: {
      name: "Shared IT & Presentation Equipment",
      description: "Portable display projectors, presentation laptops, and conference speakerphones for off-site or multi-room deployment.",
    },
  });

  console.log("✅ Seeded 5 official business resource categories.");

  // 3. Create Resources for each Category per Business Specification

  // Category 1 Resources: Meeting & Conference Rooms
  const podB = await prisma.resource.create({
    data: {
      name: "Agile Discussion Pod B",
      description: "Quick standup and huddle room for small teams with magnetic whiteboard and acoustic baffles.",
      location: "Building A - Floor 2",
      capacity: 6,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false, // Instant booking per Scenario A
      categoryId: meetingRoomsCat.id,
    },
  });

  const roomA = await prisma.resource.create({
    data: {
      name: "Conference Room A",
      description: "Collaborative meeting space with 65-inch 4K interactive display and Polycom video bar.",
      location: "Building A - Floor 2",
      capacity: 10,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: meetingRoomsCat.id,
    },
  });

  const boardroom = await prisma.resource.create({
    data: {
      name: "Executive Boardroom (Room 301)",
      description: "High-demand executive boardroom. Seats 16 people. 4K dual conference displays, executive layout.",
      location: "Building A - Floor 3",
      capacity: 16,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true, // Requires admin approval per Business Policy
      categoryId: meetingRoomsCat.id,
    },
  });

  // Category 2 Resources: Media & Production Equipment
  const cameraKit = await prisma.resource.create({
    data: {
      name: "Sony FX3 4K Cinema Camera Kit",
      description: "Complete rig with 24-70mm f/2.8 GM lens, dual wireless microphones, cage, and battery kit.",
      location: "Media Lab Cabinet #4",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true, // High-value asset requiring admin signoff per Scenario C
      categoryId: mediaEquipmentCat.id,
    },
  });

  const lightingKit = await prisma.resource.create({
    data: {
      name: "Studio Lighting Kit",
      description: "Dual bi-color LED panels with softboxes, wireless remote, and air-cushioned light stands.",
      location: "Media Lab Cabinet #2",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: mediaEquipmentCat.id,
    },
  });

  const micSet = await prisma.resource.create({
    data: {
      name: "Wireless Microphone Set",
      description: "Dual-channel 2.4GHz wireless lavalier microphone system with USB-C and Lightning audio adapters.",
      location: "Media Lab Cabinet #3",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: mediaEquipmentCat.id,
    },
  });

  const tripodKit = await prisma.resource.create({
    data: {
      name: "Heavy-Duty Tripod Kit",
      description: "Carbon-fiber video tripod with smooth fluid head, quick-release plate, and carrying case.",
      location: "Media Lab Shelf A",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: mediaEquipmentCat.id,
    },
  });

  // Category 3 Resources: Technical & Lab Workstations
  const aiWorkstation = await prisma.resource.create({
    data: {
      name: "AI Development Workstation",
      description: "Dual RTX 4090 GPUs, 128GB DDR5 RAM, 4TB NVMe SSD for local LLM fine-tuning and inference testing.",
      location: "Tech Lab 1 - Bench 4",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: technicalWorkstationsCat.id,
    },
  });

  const mobileStation = await prisma.resource.create({
    data: {
      name: "Mobile Device Testing Station",
      description: "Multi-device iOS & Android test rack. Under IT inspection for hardware fault per Scenario D.",
      location: "QA Lab - Station 2",
      capacity: 1,
      status: ResourceStatus.MAINTENANCE, // Scenario D: marked as under maintenance
      requiresApproval: false,
      categoryId: technicalWorkstationsCat.id,
    },
  });

  const qaBench = await prisma.resource.create({
    data: {
      name: "QA Automation Bench",
      description: "Continuous integration test execution bench with high-bandwidth network capture analyzer.",
      location: "Tech Lab 2 - Bench 1",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false, // Scenario E: booked for test session
      categoryId: technicalWorkstationsCat.id,
    },
  });

  // Category 4 Resources: Training & Collaboration Spaces
  const trainingRoom1 = await prisma.resource.create({
    data: {
      name: "Training Room 1",
      description: "Tiered training space with high-lumen laser projector, dual motorized whiteboards, and audio amplification.",
      location: "Floor 1 - West Wing",
      capacity: 24,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: trainingSpacesCat.id,
    },
  });

  const workshopSpace = await prisma.resource.create({
    data: {
      name: "Workshop Space",
      description: "Open modular design-thinking space with movable whiteboards, sticky-note walls, and collaboration pods.",
      location: "Floor 2 - Collaboration Hub",
      capacity: 18,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: trainingSpacesCat.id,
    },
  });

  const innovationLab = await prisma.resource.create({
    data: {
      name: "Innovation Lab",
      description: "Hardware prototyping and experimentation lab with 3D printers, soldering stations, and oscilloscope.",
      location: "Floor 1 - Hardware Wing",
      capacity: 12,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: true,
      categoryId: trainingSpacesCat.id,
    },
  });

  // Category 5 Resources: Shared IT & Presentation Equipment
  const projectorKit = await prisma.resource.create({
    data: {
      name: "Portable Projector Kit",
      description: "Compact 4K ANSI-lumen laser projector with HDMI, USB-C, and wireless AirPlay/Miracast support.",
      location: "IT Helpdesk Cabinet A",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: itEquipmentCat.id,
    },
  });

  const laptop = await prisma.resource.create({
    data: {
      name: "Presentation Laptop",
      description: "High-performance ultrabook preconfigured with presentation remotes, dongles, and pointer software.",
      location: "IT Helpdesk Cabinet B",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: itEquipmentCat.id,
    },
  });

  const speakerphone = await prisma.resource.create({
    data: {
      name: "Conference Speakerphone",
      description: "Omnidirectional 360-degree Bluetooth & USB conference speakerphone with active noise cancellation.",
      location: "IT Helpdesk Cabinet A",
      capacity: 1,
      status: ResourceStatus.AVAILABLE,
      requiresApproval: false,
      categoryId: itEquipmentCat.id,
    },
  });

  console.log("✅ Seeded 16 realistic resources across all 5 business categories.");

  // 4. Create Business Scenario Reservations for Thursday, 15 October 2026 (Asia/Colombo UTC+05:30)
  // Scenario A: Sprint planning in Agile Discussion Pod B (14:00 to 15:30) - APPROVED
  await prisma.reservation.create({
    data: {
      title: "Sprint Planning Session",
      description: "Engineering team two-week sprint backlog grooming and story point allocation.",
      startTime: new Date("2026-10-15T14:00:00+05:30"),
      endTime: new Date("2026-10-15T15:30:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: intern.id,
      resourceId: podB.id,
    },
  });

  // Scenario 7 (09:00): Morning Sprint Planning & Architecture Review in Conference Room A - APPROVED
  await prisma.reservation.create({
    data: {
      title: "Daily Stand-up & Architecture Review",
      description: "Daily synchronization for mobile and web cross-platform engineering teams.",
      startTime: new Date("2026-10-15T09:00:00+05:30"),
      endTime: new Date("2026-10-15T10:30:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: devUser.id,
      resourceId: roomA.id,
    },
  });

  // Scenario C: Marketing Camera Request for Sony FX3 (13:00 to 17:00) - PENDING
  await prisma.reservation.create({
    data: {
      title: "Client Product Demonstration Recording",
      description: "Recording high-definition promotional videos and product walkthrough for global launch.",
      startTime: new Date("2026-10-15T13:00:00+05:30"),
      endTime: new Date("2026-10-15T17:00:00+05:30"),
      status: ReservationStatus.PENDING,
      userId: marketingUser.id,
      resourceId: cameraKit.id,
    },
  });

  // Scenario E: Developer books QA Automation Bench (10:30 to 12:30) - APPROVED
  await prisma.reservation.create({
    data: {
      title: "Release Candidate Regression Test Run",
      description: "Two-hour automated test session running CI/CD regression suite on staging backend.",
      startTime: new Date("2026-10-15T10:30:00+05:30"),
      endTime: new Date("2026-10-15T12:30:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: intern.id,
      resourceId: qaBench.id,
    },
  });

  // Additional Scenario: Boardroom Strategy Review on Oct 16, 2026 - APPROVED
  await prisma.reservation.create({
    data: {
      title: "Executive Client Strategy Review",
      description: "Quarterly business review with enterprise partners.",
      startTime: new Date("2026-10-16T10:00:00+05:30"),
      endTime: new Date("2026-10-16T12:00:00+05:30"),
      status: ReservationStatus.APPROVED,
      userId: admin.id,
      resourceId: boardroom.id,
    },
  });

  console.log("✅ Seeded realistic reservations matching PrimeWave Lab business workflows.");
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
