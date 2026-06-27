import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization - allow Cloudinary and placeholder domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: process.env.BUNNY_STREAM_HOSTNAME || "vz-a108884a-b18.b-cdn.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
    ],
    // Optimize image formats
    formats: ["image/avif", "image/webp"],
  },

  // Server external packages for Prisma
  serverExternalPackages: ["@prisma/client"],

  // Experimental features
  experimental: {
    // Allow large admin video uploads through middleware/app route parsing.
    middlewareClientMaxBodySize: "2gb",
    // Enable server actions (stable in Next.js 15)
    serverActions: {
      bodySizeLimit: "500mb", // Allow large video uploads
    },
    // Optimize package imports
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "gsap",
      "@tanstack/react-query",
    ],
  },
};

export default nextConfig;
