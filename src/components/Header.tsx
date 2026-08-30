import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  MapPin, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  PlusCircle, 
  Bell, 
  ShieldCheck, 
  Layers, 
  Compass, 
  Store, 
  Crown,
  ChevronDown,
  Navigation,
  Check,
  Megaphone,
  Mail,
  Key,
  ShieldAlert,
  LogIn,
  LogOut,
  Smartphone,
  UserPlus
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { EmailOutboxDrawer } from './EmailOutboxDrawer';
import { AuthTestSuiteModal } from './AuthTestSuiteModal';

const CITIES = [
  { name: 'All Nigeria', state: 'Nationwide', lat: 9.0820, lng: 8.6753 },
  { name: 'Kaduna', state: 'Kaduna State', lat: 10.5105, lng: 7.4165 },
  { name: 'Lagos', state: 'Lagos State', lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja', state: 'FCT', lat: 9.0765, lng: 7.3986 },
  { name: 'Kano', state: 'Kano State', lat: 12.0022, lng: 8.5920 },
  { name: 'Port Harcourt', state: 'Rivers State', lat: 4.8156, lng: 7.0498 },
  { name: 'Ibadan', state: 'Oyo State', lat: 7.3775, lng: 3.9470 },
  { name: 'Enugu', state: 'Enugu State', lat: 6.4584, lng: 7.5464 }
];

export const Header: React.FC = () => {
  const { 
    currentUser, 
    isAuthenticated,
    logout,
    logoutAll,
    switchUserRole, 
    currentLocation, 
    setCurrentLocation, 
    detectCurrentLocation,
    searchQuery, 
    setSearchQuery, 
    activeView, 
    setActiveView, 
    notifications,
    conversations,
    setIsNotificationDrawerOpen,
    setIsCreateAdModalOpen
  } = useApp();

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Security & Auth Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot' | 'admin_setup' | 'verify'>('login');
  const [authModalToken, setAuthModalToken] = useState('');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  const unreadNotifsCount = notifications.filter(n => !n.read).length;
  const unreadMsgsCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleApplyTokenFromOutbox = (template: string, token: string) => {
    setAuthModalToken(token);
    if (template === 'verification') {
      setAuthModalTab('verify');
    } else if (template === 'admin_setup') {
      setAuthModalTab('admin_setup');
    } else if (template === 'password_reset') {
      setAuthModalTab('login');
    }
    setIsAuthModalOpen(true);
  };

  return (
    <header id="boost-market-header" className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Banner for CEO / Brand */}
      <div id="header-top-banner" className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 px-4 py-1 text-xs text-slate-300 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Real Boosters Ecosystem
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 hidden sm:inline">Official Platform by CEO Maddy (Muhammad Kabir Ahmad)</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setIsOutboxOpen(true)}
            className="text-slate-300 hover:text-emerald-400 font-medium flex items-center gap-1 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 hover:border-emerald-500/50 transition-all"
            title="Inspect mock outbound emails with single-use verification/activation tokens"
          >
            <Mail className="w-3 h-3 text-emerald-400" />
            <span>Email Outbox (Tokens)</span>
          </button>
          <button
            onClick={() => setIsTestSuiteOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Auth Suite (10 Tests)</span>
          </button>
          <span className="text-emerald-400 font-medium hidden md:inline">⚡ Instant NGN & FX Settlement via Flutterwave</span>
          <button 
            onClick={() => setActiveView('pricing_plans')}
            className="text-amber-400 hover:text-amber-300 transition-colors font-semibold flex items-center gap-1"
          >
            <Crown className="w-3 h-3" /> Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveView('discover')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
          id="logo-brand-btn"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                B⚡
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                BOOST MARKET
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-medium">
              By Real Boosters
            </p>
          </div>
        </div>

        {/* Location Selector Dropdown */}
        <div className="relative hidden md:block">
          <button
            id="location-picker-btn"
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-all hover:border-emerald-500/50"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="max-w-[120px] truncate">{currentLocation.city}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLocationDropdownOpen && (
            <div 
              id="location-picker-menu"
              className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Location</span>
                <button
                  onClick={() => {
                    detectCurrentLocation();
                    setIsLocationDropdownOpen(false);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  <Navigation className="w-3 h-3" /> Auto GPS
                </button>
              </div>
              <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentLocation.city === c.name 
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.name} <span className="text-slate-500 text-[10px]">({c.state})</span></span>
                    {currentLocation.city === c.name && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search ads, services, tailors, tech, products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            id="nav-discover-btn"
            onClick={() => setActiveView('discover')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'discover'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Marketplace</span>
          </button>

          <button
            id="nav-ai-marketing-btn"
            onClick={() => setActiveView('ai_marketing')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
              activeView === 'ai_marketing'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-indigo-500/10 shadow-lg'
                : 'text-indigo-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden lg:inline">AI Marketing</span>
            <span className="text-[9px] bg-indigo-500 text-white font-bold px-1 rounded">AI</span>
          </button>

          <button
            id="nav-campaigns-btn"
            onClick={() => setActiveView('campaigns')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'campaigns'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Ad Engine</span>
          </button>

          <button
            id="nav-messages-btn"
            onClick={() => setActiveView('messages')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
              activeView === 'messages'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Chat</span>
            {unreadMsgsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {unreadMsgsCount}
              </span>
            )}
          </button>

          <button
            id="nav-invoices-btn"
            onClick={() => setActiveView('invoices')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'invoices'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Invoices</span>
          </button>

          <button
            id="nav-merchant-btn"
            onClick={() => setActiveView('merchant_dashboard')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'merchant_dashboard'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">My Business</span>
          </button>

          {currentUser.role === 'SUPER_ADMIN' ? (
            <button
              id="nav-admin-btn"
              onClick={() => setActiveView('admin_panel')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeView === 'admin_panel'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400 hover:bg-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">CEO / Admin</span>
            </button>
          ) : null}
        </nav>

        {/* Action Buttons & Profile Switcher */}
        <div className="flex items-center gap-2">
          {/* Post Ad Button */}
          <button
            id="post-ad-header-btn"
            onClick={() => setIsCreateAdModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-102"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post Ad / Boost</span>
          </button>

          {/* Notifications Bell */}
          <button
            id="notification-bell-btn"
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Push Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-slate-900">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              id="persona-switcher-btn"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 transition-all"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500/50"
              />
              <div className="text-left hidden md:block pr-1">
                <div className="text-xs font-bold leading-tight text-slate-200 truncate max-w-[100px]">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-emerald-400 capitalize font-medium">
                  {currentUser.role === 'SUPER_ADMIN' ? '👑 Super Admin Maddy' : 'Client Account'}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserDropdownOpen && (
              <div 
                id="persona-switcher-menu"
                className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400">{currentUser.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Tier: {currentUser.tier.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400">{currentLocation.city}</span>
                  </div>
                </div>

                <div className="py-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    Switch Active Persona:
                  </div>

                  <button
                    onClick={() => {
                      switchUserRole('ceo');
                      setIsUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                      currentUser.role === 'SUPER_ADMIN' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-bold">Maddy (SUPER_ADMIN)</div>
                      <div className="text-[10px] text-slate-400">Full system & platform governance</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      switchUserRole('business');
                      setIsUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                      currentUser.clientType === 'business' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold">Business Owner Mode</div>
                      <div className="text-[10px] text-slate-400">Post ads, manage catalog, send invoices</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      switchUserRole('customer');
                      setIsUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-colors ${
                      currentUser.clientType === 'customer' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <div>
                      <div className="font-bold">Customer Mode (David)</div>
                      <div className="text-[10px] text-slate-400">Browse, chat, hire, pay invoices</div>
                    </div>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-col gap-1">
                  <button
                    id="header-register-nav-btn"
                    onClick={() => {
                      setActiveView('register');
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-emerald-400 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Client Registration (/register)
                  </button>

                  <button
                    onClick={() => {
                      setAuthModalTab('login');
                      setAuthModalToken('');
                      setIsAuthModalOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Sign In / Account Switcher
                  </button>

                  <button
                    onClick={() => {
                      setIsSecurityModalOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-400" /> Security, 2FA & Active Sessions
                  </button>

                  <button
                    onClick={() => {
                      setIsOutboxOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Outbox Tokens & Links
                  </button>

                  <button
                    onClick={() => {
                      setIsTestSuiteOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Run Security Verification Suite
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('pricing_plans');
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-amber-400 hover:bg-slate-800 rounded font-medium flex items-center gap-2"
                  >
                    <Crown className="w-3.5 h-3.5" /> Upgrade Plan (Free/Pro/Enterprise)
                  </button>

                  <button
                    onClick={async () => {
                      await logout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded font-medium flex items-center gap-2 border-t border-slate-800/80 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Terminate Session / Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        initialToken={authModalToken}
      />

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

      {/* Automated Auth & Authorization Test Suite Runner */}
      <AuthTestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
      />
    </header>
  );
};
