import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Cloudflare Pages specific settings
  output: 'standalone',
};

export default nextConfig;
