import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { ForgotPasswordView } from '../../../components/ForgotPasswordView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Request a secure password reset link for your Boost Market account.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <ForgotPasswordView />
      </main>
      <Footer />
    </div>
  );
}
