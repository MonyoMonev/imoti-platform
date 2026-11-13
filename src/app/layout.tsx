import type { Metadata, Viewport } from 'next';
import { Cormorant, Sofia_Sans, Sofia_Sans_Extra_Condensed } from 'next/font/google';
import { BRAND } from '@/lib/brand';
import './tokens.css';

const serif = Cormorant({
  subsets: ['latin', 'cyrillic'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Sofia_Sans({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const cond = Sofia_Sans_Extra_Condensed({ subsets: ['latin', 'cyrillic'], variable: '--font-cond', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  title: { default: `${BRAND.full}, ${BRAND.city}`, template: `%s | ${BRAND.full}` },
  description: `Агенция за недвижими имоти във ${BRAND.city}. Продажби, наеми и брокери, които познават кварталите вход по вход.`,
  openGraph: { siteName: BRAND.full, locale: 'bg_BG', type: 'website' },
  // Докато сайтът е демо, търсачките не го индексират. За жив сайт: ALLOW_INDEX=1.
  robots: process.env.ALLOW_INDEX ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f3efe7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${serif.variable} ${sans.variable} ${cond.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
