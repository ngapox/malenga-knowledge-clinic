// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: __dirname,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;