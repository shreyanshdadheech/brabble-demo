/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    }
    return config
  },
  // Enable experimental features for better hot reload
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' www.google.com *.google.com;",
          },
        ],
      },
    ]
  },
}

export default nextConfig
