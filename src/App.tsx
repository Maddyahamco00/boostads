import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DiscoverView } from './components/DiscoverView';
// TODO: Re-enable when Feature 2.x (Business Directory & Profiles) is implemented.
// import { BusinessProfileView } from './components/BusinessProfileView';
// TODO: Re-enable when Feature 6.x (Gemini AI Marketing Assistant) is implemented.
// import { AIMarketingView } from './components/AIMarketingView';
// TODO: Re-enable when Feature 5.x (Real-Time Messaging) is implemented.
// import { MessagingView } from './components/MessagingView';
// TODO: Re-enable when Feature 4.x (Multi-Currency Invoicing & Payments) is implemented.
// import { InvoicesView } from './components/InvoicesView';
// TODO: Re-enable when Feature 7.x (Merchant Dashboard & Catalog) is implemented.
// import { MerchantDashboardView } from './components/MerchantDashboardView';
// TODO: Re-enable when Feature 3.x (Multi-Platform Ad Campaigns) is implemented.
// import { CampaignManagementView } from './components/CampaignManagementView';
// TODO: Re-enable when Feature 8.x (SaaS Subscription Tiers) is implemented.
// import { PricingPlansView } from './components/PricingPlansView';
import { AdminPanelView } from './components/AdminPanelView';
import { AdminLoginView } from './components/AdminLoginView';
import { RegisterView } from './components/RegisterView';
import { LoginView } from './components/LoginView';
import { VerifyEmailView } from './components/VerifyEmailView';
// TODO: Re-enable when Feature 3.x (Ad Posting Modal) is implemented.
// import { CreateAdModal } from './components/CreateAdModal';
// TODO: Re-enable when Feature 9.x (Push Notification Drawer) is implemented.
// import { NotificationDrawer } from './components/NotificationDrawer';
// TODO: Re-enable when Feature 10.x (Report Listing Modal) is implemented.
// import { ReportModal } from './components/ReportModal';
import { 
  ShieldCheck, 
  Sparkles, 
  Crown,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeView, setActiveView } = useApp();

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Header />

      {/* Main Content Body */}
      <main className="flex-1 w-full">
        {activeView === 'discover' && <DiscoverView />}
        {activeView === 'register' && <RegisterView />}
        {activeView === 'login' && <LoginView />}
        {activeView === 'verify_email' && <VerifyEmailView />}
        {activeView === 'admin_login' && <AdminLoginView />}
        {activeView === 'admin_panel' && <AdminPanelView />}
      </main>

      {/* Minimal Footer */}
      <footer id="boost-market-footer" className="w-full bg-white border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              B
            </div>
            <span>Boost Market</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <button 
              onClick={() => setActiveView('discover')} 
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Explore
            </button>
            <button 
              onClick={() => setActiveView('register')} 
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Sign Up
            </button>
            <button 
              onClick={() => setActiveView('login')} 
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Login
            </button>
          </div>

          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} Boost Market. All rights reserved.
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
