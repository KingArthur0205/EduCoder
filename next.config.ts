import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better deployment compatibility
  experimental: {
    // Enable server actions for better file handling
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  
  // Ensure static files are properly handled
  trailingSlash: false,
  
  // Add headers for better file upload support
  async headers() {
    return [
      {
        // Apply headers to API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Configure this properly for production
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
