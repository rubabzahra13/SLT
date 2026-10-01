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
    // Vercel: beforeFiles so the App Router cannot 404 /api before the
    // Python serverless function runs. Destination must be the function
    // route (/api/index), not a filesystem path with .py.
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "/api/index",
        },
      ],
    };
  },
};

export default nextConfig;
