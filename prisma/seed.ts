// ===========================================
// HerPrivateCinema - Database Seed Script (SQLite compatible)
// ===========================================
// Sets up the private access profile only. No demo videos are created.
// Run with: npm run db:seed or npx tsx prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  await prisma.user.upsert({
    where: { email: "private@herprivatecinema.local" },
    update: {
      name: "My Love",
      role: "ADMIN",
    },
    create: {
      email: "private@herprivatecinema.local",
      name: "My Love",
      hashedPassword: "single-password-auth",
      role: "ADMIN",
    },
  });
  console.log("Private access profile is ready.");

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
        { cloudinaryId: { startsWith: "streamvault/seed/" } },
        { cloudinaryUrl: { contains: "res.cloudinary.com/demo/" } },
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
