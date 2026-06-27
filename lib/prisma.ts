// ===========================================
// PrivateVideos - Prisma Client Singleton with SQLite compatibility extension
// ===========================================
// Extends the Prisma client to dynamically convert raw SQLite text columns
// (categoriesRaw and tagsRaw) to arrays of strings (categories and tags)
// on all fetch operations, maintaining full alignment with the application layer.

import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const basePrisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  return basePrisma.$extends({
    result: {
      video: {
        categories: {
          needs: { categoriesRaw: true },
          compute(video) {
            return video.categoriesRaw
              ? video.categoriesRaw.split(",").filter(Boolean)
              : [];
          },
        },
        tags: {
          needs: { tagsRaw: true },
          compute(video) {
            return video.tagsRaw ? video.tagsRaw.split(",").filter(Boolean) : [];
          },
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
