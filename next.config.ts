import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma + Vercel: Explicitly include binary files in serverless functions
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/libquery_engine-*.so.node'],
  },

  // Exclude client-only packages from server bundle
  // pdfjs-dist and canvas are only used in client components
  serverExternalPackages: ['pdfjs-dist', 'canvas'],
};

export default nextConfig;
