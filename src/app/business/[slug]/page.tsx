import type { Metadata } from 'next';
import { businessService } from '../../../server/services/businessService';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { BusinessProfileView } from '../../../components/BusinessProfileView';
import { PublicBusinessProfile } from '../../../types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await businessService.getPublicBusinessProfile(slug);
    const biz = result.business;
    const title = `${biz.name} | Boost Market`;
    const description = biz.description 
      ? (biz.description.length > 160 ? `${biz.description.slice(0, 157)}...` : biz.description)
      : (biz.tagline || `Discover ${biz.name} on Boost Market — verified digital business presence.`);

    const images = biz.coverImageUrl ? [biz.coverImageUrl] : (biz.logoUrl ? [biz.logoUrl] : []);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `/business/${encodeURIComponent(biz.slug || slug)}`,
        images
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images
      }
    };
  } catch {
    return {
      title: 'Business Profile | Boost Market',
      description: 'Discover local businesses, advertising services, and verified merchants on Boost Market.'
    };
  }
}

export default async function BusinessPublicPage({ params }: PageProps) {
  const { slug } = await params;
  let initialBusiness: PublicBusinessProfile | null = null;

  try {
    const result = await businessService.getPublicBusinessProfile(slug);
    initialBusiness = result.business;
  } catch {
    initialBusiness = null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#111827] dark:text-slate-100 flex flex-col selection:bg-[#16C784] selection:text-white">
      <Header />
      <main className="flex-1 w-full">
        <BusinessProfileView
          initialBusiness={initialBusiness}
          slug={slug}
          isStandalonePage={true}
        />
      </main>
      <Footer />
    </div>
  );
}
