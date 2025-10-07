/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // This rule handles the pdf.worker.mjs file
    config.module.rules.push({
      test: /pdf\.worker\.mjs$/,
      type: "asset/resource",
      generator: {
        filename: "static/chunks/[name].[hash][ext]",
      },
    });

    // This alias can help avoid other canvas-related issues with pdf-parse
    config.resolve.alias.canvas = false;

    return config;
  },
};

export default nextConfig;