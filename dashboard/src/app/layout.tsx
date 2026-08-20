import './globals.css';
import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono } from 'next/font/google';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['500', '600'] });

export const metadata: Metadata = {
  title: 'FreshGuard',
  description: 'Predictive cold-chain monitoring platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
