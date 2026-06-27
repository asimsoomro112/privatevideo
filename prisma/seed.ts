// ===========================================
// PrivateVideos - Database Seed Script
// ===========================================
// Sets up the shared local profile only. No demo videos are created.
// Run with: npm run db:seed or npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  await prisma.user.upsert({
    where: { email: "private@privatevideos.local" },
    update: {
      name: "Private Viewer",
      role: "ADMIN",
    },
    create: {
      email: "private@privatevideos.local",
      name: "Private Viewer",
      hashedPassword: "public-profile",
      role: "ADMIN",
    },
  });
  console.log("Shared profile is ready.");

  const removedDemoUsers = await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "admin@streamvault.com",
          "demo@streamvault.com",
          "guest@streamvault.local",
        ],
      },
    },
  });

  if (removedDemoUsers.count > 0) {
    console.log(`Removed ${removedDemoUsers.count} old demo user(s).`);
  }

  const removedDemoVideos = await prisma.video.deleteMany({
    where: {
      OR: [
        { streamId: { startsWith: "streamvault/seed/" } },
        { streamUrl: { contains: "res.cloudinary.com/demo/" } },
      ],
    },
  });

  if (removedDemoVideos.count > 0) {
    console.log(`Removed ${removedDemoVideos.count} old demo video(s).`);
  }

  console.log("Database seeding completed successfully. No demo videos added.");
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
