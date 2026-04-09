import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Cloudflare Pages specific settings
  serverActions: {
    allowedOrigins: ['remove-img-background.homes'],
  },
};

export default nextConfig;
