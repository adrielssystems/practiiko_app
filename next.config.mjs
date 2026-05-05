/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
