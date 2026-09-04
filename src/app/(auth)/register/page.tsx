import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { RegisterView } from '../../../components/RegisterView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Create an Account',
  description: 'Join Boost Market to advertise, discover verified businesses, and access local commerce.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <RegisterView />
      </main>
      <Footer />
    </div>
  );
}
