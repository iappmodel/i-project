import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ELO Stage 1',
  description: 'ELO mock personal intelligence layer',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

