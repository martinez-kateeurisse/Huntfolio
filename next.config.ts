import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the server-only text-extraction libs external so Next doesn't try to
  // bundle them (they read files / use Node APIs at import time).
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
