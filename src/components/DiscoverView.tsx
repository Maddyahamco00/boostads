import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UserPlus, 
  LogIn, 
  Mail, 
  Key, 
  ShieldCheck, 
  Store,
  ArrowRight
} from 'lucide-react';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { EmailOutboxDrawer } from './EmailOutboxDrawer';
import { AuthTestSuiteModal } from './AuthTestSuiteModal';

export const DiscoverView: React.FC = () => {
  const { 
    isAuthenticated,
    setActiveView 
  } = useApp();

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  const handleApplyTokenFromOutbox = (_template: string, token: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/verify-email?token=${token}`);
    }
    setActiveView('verify_email');
    setIsOutboxOpen(false);
  };

  return (
    <div id="discover-view-container" className="min-h-screen bg-[#F9FAFB] pb-24 text-[#111827]">
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
          Boost Market
        </h1>
        
        <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
          Find businesses. Discover services. Grow your business.
        </p>

        {/* Hero Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!isAuthenticated ? (
            <>
              <button
                id="hero-register-btn"
                onClick={() => setActiveView('register')}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
              >
                Get Started
              </button>

              <button
                id="hero-login-btn"
                onClick={() => setActiveView('login')}
                className="px-6 py-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm border border-gray-200 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </>
          ) : (
            <button
              id="hero-security-btn"
              onClick={() => setIsSecurityModalOpen(true)}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Manage Security & 2FA
            </button>
          )}
        </div>
      </section>

      {/* Main Feature Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Registration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Create Account
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Register as a business or customer client with instant verification.
              </p>
            </div>
            <button
              onClick={() => setActiveView('register')}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Card 2: Sign In */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <LogIn className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Client Sign In
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Sign in securely with session management and rate-limiting.
              </p>
            </div>
            <button
              onClick={() => setActiveView('login')}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Card 3: Email Verification */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Email Verification
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Verify your account with single-use activation tokens.
              </p>
            </div>
            <button
              onClick={() => setActiveView('verify_email')}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Verify Email</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Card 4: Security & 2FA */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Security & 2FA
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Manage authenticator apps, recovery codes, and active sessions.
              </p>
            </div>
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Manage Security</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Card 5: Email Outbox */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Email Outbox
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Inspect simulated emails and activation tokens in real-time.
              </p>
            </div>
            <button
              onClick={() => setIsOutboxOpen(true)}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>View Outbox</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Card 6: Security Test Suite */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Security Tests
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                Run automated end-to-end tests for authentication and access control.
              </p>
            </div>
            <button
              onClick={() => setIsTestSuiteOpen(true)}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Run Tests</span>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

        </div>
      </section>

      {/* Security & 2FA Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Email Outbox Drawer */}
      <EmailOutboxDrawer
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
        onApplyToken={handleApplyTokenFromOutbox}
      />

      {/* Auth Test Suite Modal */}
      <AuthTestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
      />
    </div>
  );
};
