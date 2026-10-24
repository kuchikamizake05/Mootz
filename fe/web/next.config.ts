import type { NextConfig } from "next";

// Device testing over a single HTTPS tunnel: proxy /v1/* to the local backend so the
// phone talks to one origin. Server-only and off unless set; business logic stays in be/.
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/landing/index.html" }],
      afterFiles: apiProxyTarget ? [{ source: "/v1/:path*", destination: `${apiProxyTarget}/v1/:path*` }] : [],
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
