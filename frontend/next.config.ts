import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js dev indicator ("N" badge) in development
  devIndicators: false,
  transpilePackages: ["lucide-react"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }],
  },

  async rewrites() {
    // Local only: proxy /api to uvicorn. On Vercel, api/index.py is the
    // Python serverless function for /api/* (zero-config alongside Next.js).
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
