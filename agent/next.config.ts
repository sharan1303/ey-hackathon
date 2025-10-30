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
    'sql.js', // Exclude from server bundle - browser only
  ],
  // Configure Turbopack to handle sql.js for client-only usage
  turbopack: {
    resolveExtensions: [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.json',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    } else {
      // For SSR, mark sql.js as external to prevent bundling
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('sql.js');
      }
    }
    return config;
  },
};

export default nextConfig;
