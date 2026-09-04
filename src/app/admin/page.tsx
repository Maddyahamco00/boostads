import type { Metadata } from 'next';
import { Header } from '../../components/Header';
import { AdminPanelView } from '../../components/AdminPanelView';
import { Footer } from '../../components/Footer';

export const metadata: Metadata = {
  title: 'Super Admin Command Center',
  description: 'Enterprise governance, user verification, compliance metrics, and audit logs.',
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <AdminPanelView />
      </main>
      <Footer />
    </div>
  );
}
