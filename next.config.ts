import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. one started by a tool) build into its own folder;
  // two servers sharing .next corrupt each other's cache
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    // `npm run lint` runs the real linter; keep it out of the production build
    // gate so pre-existing lint errors across the codebase don't block deploys.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
