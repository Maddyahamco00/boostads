import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { AdminLoginView } from '../../../components/AdminLoginView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Super Admin Portal',
  description: 'Administrative access for authorized Boost Market personnel only.',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <AdminLoginView />
      </main>
      <Footer />
    </div>
  );
}
