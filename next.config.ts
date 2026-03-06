import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root,
  },
  // WARNING: values under `env` are inlined into the client bundle.
  // This is only acceptable for test environments or non-sensitive tokens.
  env: {
    NEXT_PUBLIC_WEHOME_API_BASE_URL: process.env.WEHOME_API_BASE_URL,
    NEXT_PUBLIC_WEHOME_AUTH_TOKEN: process.env.JWT_TOKEN_SECRET,
    NEXT_PUBLIC_WEHOME_COMPANY_ID: process.env.COMPANY_ID,
  },
};

export default nextConfig;
