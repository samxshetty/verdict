import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // hides the floating Next.js "N" dev badge
  devIndicators: false,
  cacheComponents: false,
  partialPrefetching: false,
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
