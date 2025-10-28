import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for stable Prisma support
  // Turbopack in Next.js 16 doesn't properly bundle Prisma binaries yet
  // Using webpack ensures Prisma query engine binaries are included in deployment
};

export default nextConfig;
