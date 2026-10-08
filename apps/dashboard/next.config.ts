import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  basePath: "/admin",
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
