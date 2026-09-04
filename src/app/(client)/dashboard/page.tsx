import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { ClientProfileView } from '../../../components/ClientProfileView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Client Dashboard',
  description: 'Your Boost Market account overview, profile settings, and security controls.',
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <ClientProfileView />
      </main>
      <Footer />
    </div>
  );
}
