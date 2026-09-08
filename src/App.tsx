'use client';

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { DiscoverView } from './components/DiscoverView';
import { BusinessProfileView } from './components/BusinessProfileView';
import { MerchantDashboardView } from './components/MerchantDashboardView';
import { CampaignManagementView } from './components/CampaignManagementView';
import { AdminPanelView } from './components/AdminPanelView';
import { AdminLoginView } from './components/AdminLoginView';
import { RegisterView } from './components/RegisterView';
import { LoginView } from './components/LoginView';
import { VerifyEmailView } from './components/VerifyEmailView';
import { ForgotPasswordView } from './components/ForgotPasswordView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { ClientProfileView } from './components/ClientProfileView';
import { ClientSecuritySettingsView } from './components/ClientSecuritySettingsView';
import { CreateAdModal } from './components/CreateAdModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ReportModal } from './components/ReportModal';
import { Footer } from './components/Footer';

const MainLayout: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      {/* Navigation Header */}
      <Header />

      {/* Main Content Body */}
      <main className="flex-1 w-full">
        {activeView === 'discover' && <DiscoverView />}
        {activeView === 'create_ad' && <DiscoverView />}
        {activeView === 'business_detail' && <BusinessProfileView />}
        {activeView === 'merchant_dashboard' && <MerchantDashboardView />}
        {activeView === 'campaigns' && <CampaignManagementView />}
        {activeView === 'register' && <RegisterView />}
        {activeView === 'login' && <LoginView />}
        {activeView === 'verify_email' && <VerifyEmailView />}
        {activeView === 'forgot_password' && <ForgotPasswordView />}
        {activeView === 'reset_password' && <ResetPasswordView />}
        {activeView === 'admin_login' && <AdminLoginView />}
        {activeView === 'admin_panel' && <AdminPanelView />}
        {activeView === 'profile' && <ClientProfileView />}
        {activeView === 'settings' && <ClientSecuritySettingsView />}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Global Modals & Drawers */}
      <CreateAdModal />
      <NotificationDrawer />
      <ReportModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
