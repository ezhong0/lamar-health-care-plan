import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.js is now available by default in Next.js 16
  // No need for experimental.instrumentationHook

  // Prisma bundling: Explicitly include Prisma binaries in serverless functions
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/.prisma/client/**/*.node',
      './node_modules/@prisma/client/**/*.node',
      './node_modules/@prisma/engines/**/*',
    ],
  },

  // Ensure Prisma binaries are bundled correctly
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      // Don't externalize Prisma
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          (external: string | Record<string, unknown>) => {
            if (typeof external === 'string') {
              return !external.includes('@prisma/client') && !external.includes('.prisma/client');
            }
            return true;
          }
        );
      }
    }
    return config;
  },
};

export default nextConfig;
