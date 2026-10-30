import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/auth/set-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
  // Leaflet is imported only from client components. No image domains are needed:
  // route maps use vector tiles and inline SVG markers.
};

export default nextConfig;
