import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['next/font/google'],
  },
  serverExternalPackages: [
    'better-sqlite3', 
    '@libsql/client', 
    'libsql',
    '@libsql/darwin-arm64',
    '@libsql/linux-x64-gnu',
    '@libsql/win32-x64-msvc',
  ],
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
};

export default nextConfig;
