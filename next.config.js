/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'i.ytimg.com',
      'play.google.com',
      'x.tago.works',
      'youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
      'firebase.google.com',
      'img.youtube.com',
      'lh3.googleusercontent.com',
      'yt3.ggpht.com',
      'i.ytimg.com',
      'i1.ytimg.com',
      'i2.ytimg.com',
      'i3.ytimg.com',
      'i4.ytimg.com',
      'i5.ytimg.com',
      'i6.ytimg.com',
      'i7.ytimg.com',
      'i8.ytimg.com',
      'i9.ytimg.com',
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/tago/:path*',
        destination: 'https://x.tago.works/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.youtube.com https://*.youtube-nocookie.com https://*.ytimg.com;
              style-src 'self' 'unsafe-inline' https:;
              img-src 'self' data: https: blob:;
              font-src 'self' data: https:;
              frame-src 'self' https: blob: https://*.youtube.com https://*.youtube-nocookie.com;
              object-src 'none';
              base-uri 'self';
              form-action 'self' https:;
              connect-src 'self' https: wss: https://x.tago.works;
              media-src 'self' https: blob:;
              worker-src 'self' blob:;
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;