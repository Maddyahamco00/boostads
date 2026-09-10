'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  MapPin, 
  ChevronDown, 
  Navigation, 
  Check, 
  Mail, 
  ShieldAlert, 
  LogIn, 
  LogOut, 
  UserPlus, 
  Shield, 
  Key,
  User,
  PlusCircle,
  Sun,
  Moon,
  Megaphone,
  BarChart2,
  Menu,
  X,
  Store,
  Layers,
  Sparkles
} from 'lucide-react';
import { Logo } from './Logo';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { EmailOutboxDrawer } from './EmailOutboxDrawer';
import { AuthTestSuiteModal } from './AuthTestSuiteModal';

const CITIES = [
  { name: 'All Nigeria', state: 'Nationwide', lat: 9.0820, lng: 8.6753 },
  { name: 'Kaduna', state: 'Kaduna', lat: 10.5105, lng: 7.4165 },
  { name: 'Lagos', state: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja', state: 'FCT', lat: 9.0765, lng: 7.3986 },
  { name: 'Kano', state: 'Kano', lat: 12.0022, lng: 8.5920 },
  { name: 'Port Harcourt', state: 'Rivers', lat: 4.8156, lng: 7.0498 },
  { name: 'Ibadan', state: 'Oyo', lat: 7.3775, lng: 3.9470 },
  { name: 'Enugu', state: 'Enugu', lat: 6.4584, lng: 7.5464 }
];

export const Header: React.FC = () => {
  const { 
    currentUser, 
    isAuthenticated,
    isLoggingOut,
    logout,
    currentLocation, 
    setCurrentLocation, 
    detectCurrentLocation,
    searchQuery, 
    setSearchQuery, 
    activeView, 
    setActiveView,
    setIsCreateAdModalOpen
  } = useApp();

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Theme Management
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial system or local theme preference
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('bm_theme') : null;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bm_theme', 'light');
    }
  };

  // Modals
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  const handleApplyTokenFromOutbox = (template: string, token: string) => {
    if (typeof window !== 'undefined') {
      if (template === 'password_reset') {
        window.history.pushState({}, '', `/reset-password?token=${token}`);
        setActiveView('reset_password');
      } else {
        window.history.pushState({}, '', `/verify-email?token=${token}`);
        setActiveView('verify_email');
      }
    }
    setIsOutboxOpen(false);
  };

  return (
    <header 
      id="boost-market-header" 
      className="sticky top-0 z-40 glass-header w-full transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Brand & Location Selector */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={() => setActiveView('discover')}
            className="flex items-center cursor-pointer group focus:outline-none"
            id="logo-brand-btn"
          >
            <Logo variant="horizontal" size="sm" showTagline={false} />
          </button>

          {/* Location Selector */}
          <div className="relative hidden lg:block">
            <button
              id="location-picker-btn"
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 glass-pill hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
              <span>{currentLocation.city}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLocationDropdownOpen && (
              <div 
                id="location-picker-menu"
                className="absolute left-0 mt-2 w-60 glass-panel rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Target Area
                  </span>
                  <button
                    onClick={() => {
                      detectCurrentLocation();
                      setIsLocationDropdownOpen(false);
                    }}
                    className="text-xs text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" /> Auto Detect
                  </button>
                </div>
                <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
                  {CITIES.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        setCurrentLocation({
                          city: c.name,
                          state: c.state,
                          country: 'Nigeria',
                          lat: c.lat,
                          lng: c.lng,
                          address: `${c.name}, ${c.state}`
                        });
                        setIsLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentLocation.city === c.name 
                          ? 'bg-indigo-600 text-white font-bold shadow-xs' 
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{c.name}</span>
                      {currentLocation.city === c.name && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar with quick shortcut */}
        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search advertisements, business services, offers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-full pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right Navigation & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Main Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-semibold">
            <button
              id="nav-explore-ads-btn"
              onClick={() => setActiveView('discover')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeView === 'discover'
                  ? 'text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Explore Ads
            </button>

            <button
              id="nav-campaigns-btn"
              onClick={() => setActiveView('campaigns')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'campaigns'
                  ? 'text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Campaigns</span>
            </button>

            <button
              id="nav-merchant-btn"
              onClick={() => setActiveView('merchant_dashboard')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'merchant_dashboard'
                  ? 'text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Business Hub</span>
            </button>
          </nav>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Primary High-Priority CTA: Advertise Your Business */}
          <button
            id="header-create-ad-btn"
            onClick={() => setIsCreateAdModalOpen(true)}
            className="btn-advertise px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Advertise</span>
            <span className="hidden sm:inline">Your Business</span>
          </button>

          {/* Developer Outbox & Diagnostics Controls */}
          <button
            onClick={() => setIsOutboxOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden md:block"
            title="Email & Notification Outbox"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsTestSuiteOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden md:block"
            title="System & Security Diagnostics"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Auth & Persona Status Dropdown */}
          {!isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                id="header-login-btn"
                onClick={() => setActiveView('login')}
                className="px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                id="persona-switcher-btn"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden lg:block pr-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    {currentUser.role === 'SUPER_ADMIN' ? 'Admin' : currentUser.clientType || 'Client'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1 hidden lg:block" />
              </button>

              {isUserDropdownOpen && (
                <div 
                  id="persona-switcher-menu"
                  className="absolute right-0 mt-2 w-64 glass-panel rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      id="header-profile-btn"
                      onClick={() => {
                        setActiveView('profile');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                      <span>Account Profile</span>
                    </button>

                    {currentUser.businessId ? (
                      <button
                        id="header-my-business-btn"
                        onClick={() => {
                          setActiveView('merchant_dashboard');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Store className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                        <span>My Business Ads & Catalog</span>
                      </button>
                    ) : (
                      <button
                        id="header-create-business-btn"
                        onClick={() => {
                          setActiveView('create_business');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Create Business</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveView('campaigns');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <Megaphone className="w-4 h-4 text-purple-500" />
                      <span>Boost Campaigns</span>
                    </button>

                    {currentUser.role === 'SUPER_ADMIN' && (
                      <button
                        id="header-admin-portal-btn"
                        onClick={() => {
                          setActiveView('admin_panel');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl flex items-center gap-2.5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    <button
                      id="header-security-settings-btn"
                      onClick={() => {
                        setActiveView('settings');
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-slate-400" />
                      <span>Security & 2FA</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      id="header-sign-out-btn"
                      disabled={isLoggingOut}
                      onClick={async () => {
                        await logout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 xl:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="xl:hidden glass-modal border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ads, services, businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-1 text-sm font-semibold">
            <button
              onClick={() => { setActiveView('discover'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-left flex items-center gap-2.5 ${activeView === 'discover' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Advertisements</span>
            </button>
            <button
              onClick={() => { setActiveView('campaigns'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-left flex items-center gap-2.5 ${activeView === 'campaigns' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Multi-Platform Campaigns</span>
            </button>
            <button
              onClick={() => { setActiveView('merchant_dashboard'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-left flex items-center gap-2.5 ${activeView === 'merchant_dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}
            >
              <Store className="w-4 h-4" />
              <span>Merchant Business Hub</span>
            </button>
          </div>
        </div>
      )}

      {/* Security & 2FA Settings Modal */}
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

      {/* Automated Auth Test Suite */}
      <AuthTestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
      />
    </header>
  );
};
