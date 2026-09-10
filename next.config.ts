import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) precisa de require nativo do Node — o bundler
  // do Next atrapalha a forma como ele resolve o "worker" internamente.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
