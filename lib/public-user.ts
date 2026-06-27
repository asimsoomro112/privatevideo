// ===========================================
// PrivateVideos - Private Single-User Profile
// ===========================================
// User-scoped features share one local profile while public browsing stays open.

import { prisma } from "@/lib/prisma";

export const PUBLIC_USER_EMAIL = "private@privatevideos.local";

export async function getPublicUser() {
  return prisma.user.upsert({
    where: { email: PUBLIC_USER_EMAIL },
    update: {
      name: "Private Viewer",
      role: "ADMIN",
    },
    create: {
      email: PUBLIC_USER_EMAIL,
      name: "Private Viewer",
      hashedPassword: "public-profile",
      role: "ADMIN",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
    },
  });
}
