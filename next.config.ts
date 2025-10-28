import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma + Vercel: Explicitly include binary files in serverless functions
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/.prisma/client/libquery_engine-*.so.node'],
    },
  },
};

export default nextConfig;
