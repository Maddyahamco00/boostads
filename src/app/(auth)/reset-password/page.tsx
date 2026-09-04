import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { ResetPasswordView } from '../../../components/ResetPasswordView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Choose a new password to restore access to your account.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <ResetPasswordView />
      </main>
      <Footer />
    </div>
  );
}
