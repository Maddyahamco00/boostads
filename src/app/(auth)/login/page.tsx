import type { Metadata } from 'next';
import { Header } from '../../../components/Header';
import { LoginView } from '../../../components/LoginView';
import { Footer } from '../../../components/Footer';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Boost Market client or business account.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <LoginView />
      </main>
      <Footer />
    </div>
  );
}
