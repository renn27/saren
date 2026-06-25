import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["192.168.100.15:3000", "localhost:3000"],
    },
  },
};

export default nextConfig;
