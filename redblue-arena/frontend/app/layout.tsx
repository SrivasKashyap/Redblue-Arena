import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RedBlue Arena',
  description: 'Live gamified cybersecurity assessment platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-obsidian font-sans">{children}</body>
    </html>
  );
}
