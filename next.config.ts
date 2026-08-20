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
};

export default nextConfig;
