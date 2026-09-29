import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TopLoader } from '@/components/top-loader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Akiba Hub',
  description: 'Akiba education hub — tracks, contests, sessions and analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
