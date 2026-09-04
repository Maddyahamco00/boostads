import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { VerifyEmailView } from '../../../components/VerifyEmailView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Confirm your email address to activate all Boost Market features.',
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <VerifyEmailView />
      </main>
      <Footer />
    </div>
  );
}
