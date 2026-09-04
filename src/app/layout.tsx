import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import '../index.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: {
    default: 'Boost Market - Business Advertising & Local Marketplace',
    template: '%s | Boost Market',
  },
  description: 'Full-stack SaaS business advertising, local discovery, real-time messaging, portfolio showcase, and invoicing payment platform for all business types by Real Boosters.',
  applicationName: 'Boost Market',
  keywords: ['business advertising', 'local marketplace', 'boosters', 'invoicing', 'real boosters', 'nigeria business'],
  authors: [{ name: 'Real Boosters' }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Boost Market - Business Advertising & Local Marketplace',
    description: 'Full-stack SaaS business advertising and marketplace platform by Real Boosters.',
    type: 'website',
    siteName: 'Boost Market',
  },
};

export const viewport: Viewport = {
  themeColor: '#16C784',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-[#111827] antialiased selection:bg-[#16C784] selection:text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
