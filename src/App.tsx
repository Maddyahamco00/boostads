import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DiscoverView } from './components/DiscoverView';
import { BusinessProfileView } from './components/BusinessProfileView';
import { AIMarketingView } from './components/AIMarketingView';
import { MessagingView } from './components/MessagingView';
import { InvoicesView } from './components/InvoicesView';
import { MerchantDashboardView } from './components/MerchantDashboardView';
import { CampaignManagementView } from './components/CampaignManagementView';
import { PricingPlansView } from './components/PricingPlansView';
import { AdminPanelView } from './components/AdminPanelView';
import { CreateAdModal } from './components/CreateAdModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ReportModal } from './components/ReportModal';
import { 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Heart, 
  Crown, 
  ExternalLink 
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeView, setActiveView } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header />

      {/* Main Content Body */}
      <main className="flex-1 w-full">
        {activeView === 'discover' && <DiscoverView />}
        {activeView === 'business_detail' && <BusinessProfileView />}
        {activeView === 'ai_marketing' && <AIMarketingView />}
        {activeView === 'campaigns' && <CampaignManagementView />}
        {activeView === 'messages' && <MessagingView />}
        {activeView === 'invoices' && <InvoicesView />}
        {activeView === 'merchant_dashboard' && <MerchantDashboardView />}
        {activeView === 'pricing_plans' && <PricingPlansView />}
        {activeView === 'admin_panel' && <AdminPanelView />}
      </main>

      {/* Modals & Drawers */}
      <CreateAdModal />
      <NotificationDrawer />
      <ReportModal />

      {/* Footer */}
      <footer id="boost-market-footer" className="w-full bg-slate-950 border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            
            {/* Brand column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                  B⚡
                </div>
                <span className="text-base font-black text-white">BOOST MARKET</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The premier SaaS business advertising and local marketplace discovery platform by <strong>Real Boosters</strong>. Designed for all types of businesses, service providers, retailers, and professionals.
              </p>
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>CEO & Founder: Maddy (Muhammad Kabir Ahmad)</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">Marketplace Discovery</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => setActiveView('discover')} className="hover:text-emerald-400 transition-colors">
                    Explore Advertisements & Services
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('ai_marketing')} className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Gemini AI Copywriting Assistant</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('invoices')} className="hover:text-emerald-400 transition-colors">
                    Multi-Currency Invoices & Checkout
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView('pricing_plans')} className="hover:text-emerald-400 transition-colors">
                    SaaS Subscription Tiers & Boost Plans
                  </button>
                </li>
              </ul>
            </div>

            {/* Business Categories */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">Popular Categories</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>Tailoring, Fashion & Native Agbada</li>
                <li>Software Development & IT Solutions</li>
                <li>Automotive Mechanics & Electrical Repairs</li>
                <li>Agriculture, Livestock & Farm Produce</li>
                <li>Catering, Pastries & Restaurant Dine-in</li>
              </ul>
            </div>

            {/* Platform Security */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-3">Trust & Compliance</h4>
              <p className="text-xs text-slate-400 mb-3">
                All business settlements in Nigerian Naira (NGN) are routed through certified payment aggregators (Flutterwave & Paystack) directly into verified corporate bank accounts.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Encrypted & Verified Ecosystem</span>
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              © {new Date().getFullYear()} Boost Market • Real Boosters. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Merchant Agreement</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
