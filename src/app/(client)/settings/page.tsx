import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { ClientSecuritySettingsView } from '../../../components/ClientSecuritySettingsView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Account Security Settings - Boost Market',
  description: 'Manage your account authentication credentials, password security, and active session controls.',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <ClientSecuritySettingsView />
      </main>
      <Footer />
    </div>
  );
}
