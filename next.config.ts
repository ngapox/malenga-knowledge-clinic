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
  // Fix for 'canvas' module in PDF.js / pdf.js-extract
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize 'canvas' on the server side (treat as Node.js module)
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;