import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { ClientProfileView } from '../../../components/ClientProfileView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Account Profile & Security',
  description: 'Manage your verified personal identity, credentials, active sessions, and security logs.',
};

export default function ProfilePage() {
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
