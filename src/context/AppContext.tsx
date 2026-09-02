import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  Business, 
  Advertisement, 
  CategoryConfig, 
  SubscriptionPlan, 
  Invoice, 
  Conversation, 
  ChatMessage, 
  PushNotification, 
  PlatformStats,
  LocationCoordinates,
  Report,
  MultiPlatformCampaign,
  Lead
} from '../types';
import { authApi, onAuthStateChange, ApiError } from '../lib/api';

export type AppView = 
  | 'discover' 
  | 'business_detail' 
  | 'ai_marketing' 
  | 'create_ad' 
  | 'campaigns' 
  | 'messages' 
  | 'invoices' 
  | 'merchant_dashboard' 
  | 'pricing_plans' 
  | 'admin_panel' 
  | 'admin_login'
  | 'register' 
  | 'login'
  | 'verify_email';

interface AppContextType {
  // Authentication State
  currentUser: UserProfile;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLoggingOut: boolean;
  authError: string | null;
  allUsers: UserProfile[];
  currentLocation: LocationCoordinates;
  selectedCategory: string;
  searchQuery: string;
  activeView: AppView;
  selectedBusinessId: string | null;
  selectedAdId: string | null;
  activeConversationId: string | null;
  activeInvoiceId: string | null;
  isNotificationDrawerOpen: boolean;
  isCreateAdModalOpen: boolean;
  isReportModalOpen: boolean;
  reportingTarget: { type: 'ad' | 'business' | 'user' | 'message'; id: string; title: string } | null;

  // Data Collections
  businesses: Business[];
  advertisements: Advertisement[];
  categories: CategoryConfig[];
  subscriptionPlans: SubscriptionPlan[];
  invoices: Invoice[];
  conversations: Conversation[];
  notifications: PushNotification[];
  campaigns: MultiPlatformCampaign[];
  leads: Lead[];
  platformStats: PlatformStats | null;
  isLoading: boolean;

  // Auth & Session Actions
  login: (credentials: { email: string; password: string; clientType?: 'business' | 'customer' }) => Promise<any>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  checkAuth: () => Promise<UserProfile | null>;

  // Actions
  setCurrentUser: (user: UserProfile) => void;
  switchUserRole: (role: 'customer' | 'business' | 'ceo') => void;
  setCurrentLocation: (loc: LocationCoordinates) => void;
  detectCurrentLocation: () => void;
  setSelectedCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  setActiveView: (view: AppView) => void;
  viewBusinessDetail: (businessId: string) => void;
  viewAdDetail: (adId: string) => void;
  startChatWithBusiness: (businessId: string, initialText?: string, adId?: string) => Promise<void>;
  openInvoiceDetail: (invoiceId: string) => void;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  setIsCreateAdModalOpen: (open: boolean) => void;
  openReportModal: (type: 'ad' | 'business' | 'user' | 'message', id: string, title: string) => void;
  closeReportModal: () => void;
  markNotificationRead: (notifId: string) => void;
  refreshData: () => Promise<void>;
  updateLeadStatus: (leadId: string, status: Lead['status'], notes?: string) => Promise<void>;
}

const defaultLocation: LocationCoordinates = {
  city: 'Kaduna',
  state: 'Kaduna State',
  country: 'Nigeria',
  lat: 10.5105,
  lng: 7.4165,
  address: 'Kaduna Central, Nigeria'
};

const defaultUser: UserProfile = {
  id: 'usr_maddy_ceo',
  name: 'Muhammad Kabir Ahmad (Maddy)',
  email: 'maddyahamco00@gmail.com',
  phone: '+2348039876543',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  tier: 'enterprise',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: 'Founder & CEO of Real Boosters / Boost Market.',
  location: defaultLocation,
  businessId: 'biz_real_boosters',
  createdAt: new Date().toISOString()
};

const guestUser: UserProfile = {
  id: 'usr_david_customer',
  name: 'David Okonjo',
  email: 'david.okonjo@gmail.com',
  phone: '+2348123456789',
  role: 'CLIENT',
  status: 'ACTIVE',
  clientType: 'customer',
  tier: 'free',
  avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  bio: 'Customer looking for top-rated services.',
  location: { city: 'Abuja', state: 'FCT', country: 'Nigeria', lat: 9.0765, lng: 7.3986 },
  createdAt: new Date().toISOString()
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(guestUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([guestUser]);
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(defaultLocation);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeView, setActiveViewState] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/admin/login') {
        return 'admin_login';
      }
      if (window.location.pathname === '/admin' || window.location.pathname === '/admin/panel') {
        return 'admin_panel';
      }
      if (window.location.pathname === '/login') {
        return 'login';
      }
      if (window.location.pathname === '/register') {
        return 'register';
      }
      if (window.location.pathname === '/verify-email' || window.location.search.includes('verifyToken=') || (window.location.pathname === '/' && window.location.search.includes('token='))) {
        return 'verify_email';
      }
    }
    return 'discover';
  });

  // Check auth session on startup
  const checkAuth = useCallback(async (): Promise<UserProfile | null> => {
    try {
      setIsAuthLoading(true);
      const res = await authApi.getMe(true);
      if (res.authenticated && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        setAuthError(null);
        return res.user;
      } else {
        setCurrentUser(guestUser);
        setIsAuthenticated(false);
        return null;
      }
    } catch {
      setCurrentUser(guestUser);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  // Login handler
  const login = useCallback(async (credentials: { email: string; password: string; clientType?: 'business' | 'customer' }) => {
    try {
      setAuthError(null);
      const result = await authApi.login(credentials);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
      }
      return result;
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(guestUser);
      setAuthError(null);
      setIsLoggingOut(false);

      // Invalidate private collections & reset views
      setActiveViewState(prev => {
        if (['merchant_dashboard', 'invoices', 'campaigns', 'create_ad', 'ai_marketing', 'admin_panel'].includes(prev)) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.history.pushState({}, '', '/login');
          }
          return 'login';
        }
        return prev;
      });
    }
  }, [isLoggingOut]);

  // Logout all sessions
  const logoutAll = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(guestUser);
      setAuthError(null);
      setIsLoggingOut(false);

      setActiveViewState(prev => {
        if (['merchant_dashboard', 'invoices', 'campaigns', 'create_ad', 'ai_marketing', 'admin_panel'].includes(prev)) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.history.pushState({}, '', '/login');
          }
          return 'login';
        }
        return prev;
      });
    }
  }, [isLoggingOut]);

  // Listen to auth token expiration events from api client and other tabs
  useEffect(() => {
    const unsub = onAuthStateChange((auth, user) => {
      setIsAuthenticated(auth);
      if (user) {
        setCurrentUser(user);
      } else if (!auth) {
        setCurrentUser(guestUser);
        setActiveViewState(prev => {
          if (['merchant_dashboard', 'invoices', 'campaigns', 'create_ad', 'ai_marketing', 'admin_panel'].includes(prev)) {
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.history.pushState({}, '', '/login');
            }
            return 'login';
          }
          return prev;
        });
      }
    });
    return unsub;
  }, []);

  // Initial auth verification
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const setActiveView = useCallback((view: AppView) => {
    const isProtected = ['merchant_dashboard', 'invoices', 'campaigns', 'create_ad', 'ai_marketing', 'admin_panel'].includes(view);
    const targetView = (!isAuthenticated && isProtected) ? 'login' : view;

    setActiveViewState(targetView);
    if (typeof window !== 'undefined') {
      if (targetView === 'login') {
        if (window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
        }
      } else if (targetView === 'register') {
        if (window.location.pathname !== '/register') {
          window.history.pushState({}, '', '/register');
        }
      } else if (targetView === 'verify_email') {
        if (window.location.pathname !== '/verify-email') {
          window.history.pushState({}, '', '/verify-email');
        }
      } else {
        if (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/verify-email') {
          window.history.pushState({}, '', '/');
        }
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/login') {
        setActiveViewState('login');
      } else if (window.location.pathname === '/register') {
        setActiveViewState('register');
      } else if (window.location.pathname === '/verify-email' || window.location.search.includes('verifyToken=') || (window.location.pathname === '/' && window.location.search.includes('token='))) {
        setActiveViewState('verify_email');
      } else {
        setActiveViewState(prev => {
          if (!isAuthenticated && ['merchant_dashboard', 'invoices', 'campaigns', 'create_ad', 'ai_marketing', 'admin_panel'].includes(prev)) {
            return 'login';
          }
          return 'discover';
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isCreateAdModalOpen, setIsCreateAdModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportingTarget, setReportingTarget] = useState<{ type: 'ad' | 'business' | 'user' | 'message'; id: string; title: string } | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [campaigns, setCampaigns] = useState<MultiPlatformCampaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        bizRes,
        adsRes,
        catRes,
        plansRes,
        invRes,
        convRes,
        notifRes,
        statsRes,
        usersRes,
        campRes,
        leadsRes
      ] = await Promise.all([
        fetch('/api/businesses').then(r => r.json()),
        fetch('/api/ads').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/subscriptions/plans').then(r => r.json()),
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/conversations').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/campaigns').then(r => r.json()).catch(() => ({ success: false, campaigns: [] })),
        fetch('/api/leads').then(r => r.json()).catch(() => ({ success: false, leads: [] }))
      ]);

      if (bizRes.success) setBusinesses(bizRes.businesses);
      if (adsRes.success) setAdvertisements(adsRes.ads);
      if (catRes.success) setCategories(catRes.categories);
      if (plansRes.success) setSubscriptionPlans(plansRes.plans);
      if (invRes.success) setInvoices(invRes.invoices);
      if (convRes.success) setConversations(convRes.conversations);
      if (notifRes.success) setNotifications(notifRes.notifications);
      if (statsRes.success) setPlatformStats(statsRes.stats);
      if (usersRes.success) setAllUsers(usersRes.users);
      if (campRes.success) setCampaigns(campRes.campaigns);
      if (leadsRes.success) setLeads(leadsRes.leads);
    } catch (err) {
      console.error('Failed to load Boost Market initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const switchUserRole = (role: 'customer' | 'business' | 'ceo') => {
    if (role === 'ceo') {
      const u = allUsers.find(x => x.role === 'SUPER_ADMIN') || defaultUser;
      setCurrentUser(u);
    } else if (role === 'business') {
      const u = allUsers.find(x => x.clientType === 'business') || allUsers.find(x => x.id === 'usr_farouk_tech') || defaultUser;
      setCurrentUser(u);
    } else {
      const u = allUsers.find(x => x.clientType === 'customer') || allUsers.find(x => x.id === 'usr_david_customer') || {
        id: 'usr_david_customer',
        name: 'David Okonjo',
        email: 'david.okonjo@gmail.com',
        phone: '+2348123456789',
        role: 'CLIENT' as const,
        status: 'ACTIVE' as const,
        clientType: 'customer' as const,
        tier: 'free' as const,
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        bio: 'Customer looking for top-rated services.',
        location: { city: 'Abuja', state: 'FCT', country: 'Nigeria', lat: 9.0765, lng: 7.3986 },
        createdAt: new Date().toISOString()
      };
      setCurrentUser(u);
    }
  };

  const detectCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            city: 'Auto-Detected GPS',
            state: 'Live Coordinates',
            country: 'Nigeria',
            lat: Number(pos.coords.latitude.toFixed(4)),
            lng: Number(pos.coords.longitude.toFixed(4)),
            address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`
          });
        },
        () => {
          // Fallback location
          setCurrentLocation({
            city: 'Kaduna',
            state: 'Kaduna State',
            country: 'Nigeria',
            lat: 10.5105,
            lng: 7.4165,
            address: 'Kaduna Central, Nigeria'
          });
        }
      );
    }
  };

  const viewBusinessDetail = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setActiveView('business_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const viewAdDetail = (adId: string) => {
    setSelectedAdId(adId);
    const ad = advertisements.find(a => a.id === adId);
    if (ad) {
      // Record click/view
      fetch(`/api/ads/${adId}/click`, { method: 'POST' });
    }
  };

  const startChatWithBusiness = async (businessId: string, initialText?: string, adId?: string) => {
    try {
      const res = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: currentUser.id,
          businessId,
          initialMessage: initialText || `Hello! I would like to make an enquiry regarding your listings on Boost Market.`,
          adId
        })
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setActiveConversationId(data.conversation.id);
        setActiveView('messages');
        refreshData();
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const openInvoiceDetail = (invoiceId: string) => {
    setActiveInvoiceId(invoiceId);
    setActiveView('invoices');
  };

  const openReportModal = (type: 'ad' | 'business' | 'user' | 'message', id: string, title: string) => {
    setReportingTarget({ type, id, title });
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportingTarget(null);
  };

  const markNotificationRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status'], notes?: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status, notes: notes || l.notes, updatedAt: new Date().toISOString() } : l));
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAuthLoading,
        isLoggingOut,
        authError,
        allUsers,
        currentLocation,
        selectedCategory,
        searchQuery,
        activeView,
        selectedBusinessId,
        selectedAdId,
        activeConversationId,
        activeInvoiceId,
        isNotificationDrawerOpen,
        isCreateAdModalOpen,
        isReportModalOpen,
        reportingTarget,
        businesses,
        advertisements,
        categories,
        subscriptionPlans,
        invoices,
        conversations,
        notifications,
        campaigns,
        leads,
        platformStats,
        isLoading,
        login,
        logout,
        logoutAll,
        checkAuth,
        setCurrentUser,
        switchUserRole,
        setCurrentLocation,
        detectCurrentLocation,
        setSelectedCategory,
        setSearchQuery,
        setActiveView,
        viewBusinessDetail,
        viewAdDetail,
        startChatWithBusiness,
        openInvoiceDetail,
        setIsNotificationDrawerOpen,
        setIsCreateAdModalOpen,
        openReportModal,
        closeReportModal,
        markNotificationRead,
        refreshData,
        updateLeadStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
