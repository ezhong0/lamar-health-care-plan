import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.js is now available by default in Next.js 16
  // No need for experimental.instrumentationHook

  // Turbopack configuration for Next.js 16
  experimental: {
    turbo: {
      // Exclude test files from Turbopack bundling
      rules: {
        '*.test.{ts,tsx}': {
          loaders: [],
          as: '*.js',
        },
        '*.spec.{ts,tsx}': {
          loaders: [],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
