import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'A2SV Hub',
  description: 'A2SV education hub — tracks, contests, sessions and analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
