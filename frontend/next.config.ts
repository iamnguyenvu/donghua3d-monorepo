import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'img.otruyenapi.com',
      },
      {
        protocol: 'https',
        hostname: '**.cc',
      },
      {
        protocol: 'https',
        hostname: '**.com',
      },
      {
        protocol: 'https',
        hostname: '**.net',
      },
      {
        protocol: 'https',
        hostname: '**.org',
      },
    ],
  },
};

export default nextConfig;
