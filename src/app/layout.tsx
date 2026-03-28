import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图片背景移除",
  description: "拖拽上传图片，自动移除背景，支持 PNG 透明通道下载。图片仅在内存中处理，不做任何存储。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="min-h-screen flex flex-col antialiased">{children}</body>
    </html>
  );
}
