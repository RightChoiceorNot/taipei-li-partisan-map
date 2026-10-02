import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';

const sans = Noto_Sans_TC({ variable: '--font-sans-tc', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: '臺北市各里藍綠相對支持度地圖',
  description: '以七屆臺北市長選舉里別得票差距中位數呈現的本機互動地圖。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={sans.variable}>{children}</body>
    </html>
  );
}
