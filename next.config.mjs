/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverActions: {
    bodySizeLimit: '50mb',
  },
  async rewrites() {
    return [
      {
        source: '/uploads/products/:path*',
        destination: '/api/media/:path*',
      },
    ];
  },
};

export default nextConfig;
