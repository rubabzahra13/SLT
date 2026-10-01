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
    // Local only: proxy /api to the FastAPI process on :8001.
    // On Vercel, vercel.json routes /api → the Python serverless function.
    // Do not also rewrite here — double-routing produces opaque 500s.
    if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
      return {
        beforeFiles: [
          {
            source: "/api/:path*",
            destination: "http://127.0.0.1:8001/api/:path*",
          },
        ],
      };
    }
    return [];
  },
};

export default nextConfig;
