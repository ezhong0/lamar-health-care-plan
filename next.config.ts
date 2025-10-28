import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.js is now available by default in Next.js 16
  // No need for experimental.instrumentationHook

  // Vercel deployment: External packages for serverless compatibility
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
