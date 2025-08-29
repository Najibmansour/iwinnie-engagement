import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
  },
  async headers() {
    return [
      {
        source: '/api/upload',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
