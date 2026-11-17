/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  // Заглавието, описанието и данните за споделяне (og:title, og:image) винаги са в <head>, преди
  // останалото. По подразбиране Next.js ги праща след съдържанието, ако сървърът е зает, и тогава
  // прегледът на линк във Viber, Facebook и подобни не е сигурен. Линковете за споделяне са
  // сърцето на този сайт, затова тук не се разчита на късмет.
  htmlLimitedBots: /.*/,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2400],
  },
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
};
export default nextConfig;
