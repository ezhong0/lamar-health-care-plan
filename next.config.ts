import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.js is now available by default in Next.js 16
  // No need for experimental.instrumentationHook

  // Prisma bundling: Let Next.js bundle Prisma Client with query engine binaries
  // DO NOT externalize Prisma - the binaries need to be included in serverless functions
};

export default nextConfig;
