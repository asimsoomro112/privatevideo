// ===========================================
// HerPrivateCinema - Single Password Auth
// ===========================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const vercelUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

for (const key of ["AUTH_URL", "NEXTAUTH_URL"] as const) {
  if (
    vercelUrl &&
    (!process.env[key] || process.env[key]?.includes("localhost"))
  ) {
    process.env[key] = vercelUrl;
  }
}

const privatePassword =
  process.env.PRIVATE_ACCESS_PASSWORD || process.env.ADMIN_PASSWORD || "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Private password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = String(credentials?.password || "");

        if (!privatePassword || password !== privatePassword) {
          return null;
        }

        return {
          id: "herprivatecinema-single-user",
          name: "My Love",
          email: "private@herprivatecinema.local",
          role: "ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = "ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "herprivatecinema-single-user");
        session.user.role = "ADMIN";
      }
      return session;
    },
  },
});
