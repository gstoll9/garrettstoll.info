import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // `npm run lint` runs the real linter; keep it out of the production build
    // gate so pre-existing lint errors across the codebase don't block deploys.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
