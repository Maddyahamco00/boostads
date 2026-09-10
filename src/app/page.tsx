'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Header } from '../components/Header';
import { DiscoverView } from '../components/DiscoverView';
import { BusinessProfileView } from '../components/BusinessProfileView';
import { MerchantDashboardView } from '../components/MerchantDashboardView';
import { CampaignManagementView } from '../components/CampaignManagementView';
import { LoginView } from '../components/LoginView';
import { RegisterView } from '../components/RegisterView';
import { VerifyEmailView } from '../components/VerifyEmailView';
import { ForgotPasswordView } from '../components/ForgotPasswordView';
import { ResetPasswordView } from '../components/ResetPasswordView';
import { AdminLoginView } from '../components/AdminLoginView';
import { AdminPanelView } from '../components/AdminPanelView';
import { ClientProfileView } from '../components/ClientProfileView';
import { ClientSecuritySettingsView } from '../components/ClientSecuritySettingsView';
import { CreateBusinessView } from '../components/CreateBusinessView';
import { CreateAdModal } from '../components/CreateAdModal';
import { ReportModal } from '../components/ReportModal';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { Footer } from '../components/Footer';

export default function HomePage() {
  const { activeView } = useApp();

  const renderCurrentView = () => {
    switch (activeView) {
      case 'discover':
      case 'create_ad':
        return <DiscoverView />;
      case 'business_detail':
        return <BusinessProfileView />;
      case 'merchant_dashboard':
        return <MerchantDashboardView />;
      case 'campaigns':
        return <CampaignManagementView />;
      case 'login':
        return <LoginView />;
      case 'register':
        return <RegisterView />;
      case 'verify_email':
        return <VerifyEmailView />;
      case 'forgot_password':
        return <ForgotPasswordView />;
      case 'reset_password':
        return <ResetPasswordView />;
      case 'admin_login':
        return <AdminLoginView />;
      case 'admin_panel':
        return <AdminPanelView />;
      case 'profile':
        return <ClientProfileView />;
      case 'settings':
        return <ClientSecuritySettingsView />;
      case 'create_business':
        return <CreateBusinessView />;
      default:
        return <DiscoverView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full">
        {renderCurrentView()}
      </main>
      <Footer />

      {/* Global Application Modals */}
      <CreateAdModal />
      <ReportModal />
      <NotificationDrawer />
    </div>
  );
}
