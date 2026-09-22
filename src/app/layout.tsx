import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import '../index.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: {
    default: 'Boost Market — AI-Powered Advertising for Growing Businesses',
    template: '%s | Boost Market',
  },
  description: 'Smart Advertising. Better Results. Powered by AI. Boost Market connects businesses, products, services, and customers across Nigeria.',
  applicationName: 'Boost Market',
  keywords: ['business advertising', 'local marketplace', 'boosters', 'ai marketing', 'nigeria business', 'boost market'],
  authors: [{ name: 'Boost Market' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Boost Market — AI-Powered Advertising for Growing Businesses',
    description: 'Smart Advertising. Better Results. Powered by AI.',
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
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#071A17] text-slate-900 dark:text-slate-100 antialiased selection:bg-[#16C784] selection:text-[#071A17] transition-colors">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
