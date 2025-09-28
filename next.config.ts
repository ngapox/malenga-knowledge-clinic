// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to complete even if there are ESLint issues
    ignoreDuringBuilds: true,
  },
  // Silence the "inferred workspace root" warning
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
