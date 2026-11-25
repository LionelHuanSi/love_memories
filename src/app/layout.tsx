import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Memories — Our Little Universe',
  description: 'Bản đồ sao và dòng thời gian lưu giữ những khoảnh khắc đẹp nhất của hai người.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Memories',
  },
};

export const viewport: Viewport = {
  themeColor: '#090E20',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#090E20] text-[#F8EBDD] selection:bg-[#A78BFA] selection:text-[#090E20]">
        {children}
      </body>
    </html>
  );
}

