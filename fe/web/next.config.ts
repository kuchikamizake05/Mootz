import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/landing/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [{ source: "/app", destination: "/map", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
