import { Header } from '../components/Header';
import { DiscoverView } from '../components/DiscoverView';
import { Footer } from '../components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <DiscoverView />
      </main>
      <Footer />
    </div>
  );
}
