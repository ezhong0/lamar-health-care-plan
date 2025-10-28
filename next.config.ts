import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.js is now available by default in Next.js 16
  // No need for experimental.instrumentationHook

  // Exclude test dependencies from server bundle
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'jsdom': 'commonjs jsdom',
        'vitest': 'commonjs vitest',
        '@testing-library/react': 'commonjs @testing-library/react',
        '@testing-library/jest-dom': 'commonjs @testing-library/jest-dom',
        'happy-dom': 'commonjs happy-dom',
      });
    }
    return config;
  },
};

export default nextConfig;
