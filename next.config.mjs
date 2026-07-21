/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  experimental: {
    serverActions: {
      bodySizeLimit: '250mb',
    },
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
