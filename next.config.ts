import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["ui.aceternity.com"], // Allow images from this domain
  },
  typescript:{
    ignoreBuildErrors: true, // Ignore TypeScript errors during build
  },
  reactStrictMode: true,
};

export default nextConfig;
