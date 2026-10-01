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
    // Local: proxy /api to the FastAPI process on :8001.
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
    // Production: API is not hosted inside this Next.js project (Vercel no longer
    // treats root api/*.py as Serverless Functions alongside Next.js). Point
    // NEXT_PUBLIC_API_URL at the FastAPI host (e.g. Render) when available.
    return [];
  },
};

export default nextConfig;
