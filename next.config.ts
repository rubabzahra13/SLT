import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js dev indicator ("N" badge) in development
  devIndicators: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }],
  },
  // Prevent corrupted webpack disk cache when multiple dev servers run (causes unstyled pages)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    if (process.env.VERCEL) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
