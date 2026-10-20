import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zen moved under Doodles; keep its old address working
  async redirects() {
    return [
      { source: "/zen", destination: "/doodles/zen", permanent: true },
      { source: "/zen/fetch", destination: "/doodles/fetch", permanent: true },
    ];
  },
};

export default nextConfig;
