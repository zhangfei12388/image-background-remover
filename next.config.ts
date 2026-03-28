import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages Next.js 构建适配
  images: { unoptimized: true },
  // 指定构建产物输出位置（Cloudflare Pages Workers 构建模式）
  distDir: ".output",
};

export default nextConfig;
