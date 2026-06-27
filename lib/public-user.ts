// ===========================================
// HerPrivateCinema - Private Single-User Profile
// ===========================================
// User-scoped features share one private profile after password login.

import { prisma } from "@/lib/prisma";

export const PUBLIC_USER_EMAIL = "private@herprivatecinema.local";

export async function getPublicUser() {
  return prisma.user.upsert({
    where: { email: PUBLIC_USER_EMAIL },
    update: {
      name: "My Love",
      role: "ADMIN",
    },
    create: {
      email: PUBLIC_USER_EMAIL,
      name: "My Love",
      hashedPassword: "single-password-auth",
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
