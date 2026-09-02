import React, { useState } from 'react';
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
  Key
} from 'lucide-react';
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
    logoutAll,
    currentLocation, 
    setCurrentLocation, 
    detectCurrentLocation,
    searchQuery, 
    setSearchQuery, 
    activeView, 
    setActiveView
  } = useApp();

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Modals
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
    <header id="boost-market-header" className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Location */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveView('discover')}
            className="flex items-center gap-2 text-left cursor-pointer group"
            id="logo-brand-btn"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-blue-700 transition-colors">
              B
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              Boost Market
            </span>
          </button>

          {/* Location Selector */}
          <div className="relative hidden md:block">
            <button
              id="location-picker-btn"
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentLocation.city}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {isLocationDropdownOpen && (
              <div 
                id="location-picker-menu"
                className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in duration-100"
              >
                <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Location</span>
                  <button
                    onClick={() => {
                      detectCurrentLocation();
                      setIsLocationDropdownOpen(false);
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" /> Auto
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        currentLocation.city === c.name 
                          ? 'bg-blue-50 text-blue-600 font-semibold' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{c.name}</span>
                      {currentLocation.city === c.name && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search businesses, services, or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Nav & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="nav-discover-btn"
            onClick={() => setActiveView('discover')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeView === 'discover'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Explore
          </button>

          {/* Dev Helper Outbox Drawer */}
          <button
            onClick={() => setIsOutboxOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Outbox"
          >
            <Mail className="w-4 h-4" />
          </button>

          {/* Dev Helper Test Suite */}
          <button
            onClick={() => setIsTestSuiteOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Security Tests"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                id="header-login-btn"
                onClick={() => setActiveView('login')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeView === 'login'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Sign In
              </button>
              <button
                id="header-register-btn"
                onClick={() => setActiveView('register')}
                className="px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                id="persona-switcher-btn"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs flex items-center justify-center">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {isUserDropdownOpen && (
                <div 
                  id="persona-switcher-menu"
                  className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in duration-100"
                >
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsSecurityModalOpen(true);
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-gray-400" />
                      Security & 2FA
                    </button>
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <button
                      id="header-sign-out-btn"
                      disabled={isLoggingOut}
                      onClick={async () => {
                        await logout();
                        setIsUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
