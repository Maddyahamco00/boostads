import bcrypt from 'bcryptjs';
import { 
  Merchant, 
  Customer, 
  Payment, 
  PaymentQuote, 
  PaymentAttempt, 
  WebhookEvent, 
  LedgerEntry, 
  Settlement, 
  ReconciliationRecord, 
  RefundRecord, 
  AuditLog, 
  PlatformConfig,
  SupportedCurrency,
  CurrencyConfig,
  NigerianBank,
  UserProfile,
  UserEntity,
  AuthSession,
  VerificationToken,
  SecurityAuditEvent,
  Business,
  Product,
  Service,
  PortfolioItem,
  Advertisement,
  Invoice,
  ChatMessage,
  Conversation,
  PushNotification,
  Review,
  Report,
  CategoryConfig,
  SubscriptionPlan,
  PlatformStats,
  MultiPlatformCampaign,
  Lead
} from '../types';

export class DatabaseStore {
  // Core E-commerce & Marketplace Entities
  public users: Map<string, UserEntity> = new Map();
  public sessions: Map<string, AuthSession> = new Map();
  public tokens: Map<string, VerificationToken> = new Map();
  public securityLogs: SecurityAuditEvent[] = [];
  public businesses: Map<string, Business> = new Map();
  public products: Map<string, Product> = new Map();
  public services: Map<string, Service> = new Map();
  public portfolioItems: Map<string, PortfolioItem> = new Map();
  public advertisements: Map<string, Advertisement> = new Map();
  public campaigns: Map<string, MultiPlatformCampaign> = new Map();
  public leads: Map<string, Lead> = new Map();
  public invoices: Map<string, Invoice> = new Map();
  public conversations: Map<string, Conversation> = new Map();
  public messages: Map<string, ChatMessage> = new Map();
  public notifications: Map<string, PushNotification> = new Map();
  public reviews: Map<string, Review> = new Map();
  public reports: Map<string, Report> = new Map();
  public categories: CategoryConfig[] = [];
  public subscriptionPlans: SubscriptionPlan[] = [];

  // Financial & Settlement Entities
  public merchants: Map<string, Merchant> = new Map();
  public customers: Map<string, Customer> = new Map();
  public quotes: Map<string, PaymentQuote> = new Map();
  public payments: Map<string, Payment> = new Map();
  public paymentAttempts: Map<string, PaymentAttempt> = new Map();
  public webhookEvents: Map<string, WebhookEvent> = new Map();
  public processedEventIds: Set<string> = new Set();
  public ledgerEntries: LedgerEntry[] = [];
  public settlements: Map<string, Settlement> = new Map();
  public reconciliationRecords: ReconciliationRecord[] = [];
  public refunds: Map<string, RefundRecord> = new Map();
  public auditLogs: AuditLog[] = [];

  public platformConfig: PlatformConfig = {
    primaryProvider: 'flutterwave',
    secondaryProvider: 'paystack',
    providerFailoverEnabled: true,
    platformFeePercent: 1.5, // 1.5% platform fee
    fxSpreadPercent: 0.8, // 0.8% FX hedging spread
    quoteExpirationSeconds: 600, // 10 minutes rate lock
    autoSettlementEnabled: true,
    settlementSchedule: 'instant',
    fraudRiskThreshold: 80,
    webhookSecret: process.env.WEBHOOK_SECRET || 'flw_sec_hash_production_grade_9981'
  };

  public supportedCurrencies: CurrencyConfig[] = [
    {
      code: 'NGN',
      name: 'Nigerian Naira',
      symbol: '₦',
      flag: '🇳🇬',
      minAmount: 100,
      maxAmount: 100000000,
      supportedMethods: ['card', 'bank_transfer', 'ussd', 'qr'],
      enabled: true,
      settlementSupported: true
    },
    {
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      flag: '🇺🇸',
      minAmount: 1,
      maxAmount: 50000,
      supportedMethods: ['card', 'apple_pay', 'google_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'EUR',
      name: 'Euro (SEPA / Europe)',
      symbol: '€',
      flag: '🇪🇺',
      minAmount: 1,
      maxAmount: 50000,
      supportedMethods: ['card', 'apple_pay', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'GBP',
      name: 'British Pound Sterling',
      symbol: '£',
      flag: '🇬🇧',
      minAmount: 1,
      maxAmount: 40000,
      supportedMethods: ['card', 'apple_pay', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'AED',
      name: 'UAE Dirham (Dubai / GCC)',
      symbol: 'AED',
      flag: '🇦🇪',
      minAmount: 5,
      maxAmount: 150000,
      supportedMethods: ['card', 'apple_pay', 'google_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'CAD',
      name: 'Canadian Dollar',
      symbol: 'CA$',
      flag: '🇨🇦',
      minAmount: 1,
      maxAmount: 60000,
      supportedMethods: ['card', 'google_pay', 'apple_pay'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'ZAR',
      name: 'South African Rand',
      symbol: 'R',
      flag: '🇿🇦',
      minAmount: 20,
      maxAmount: 500000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'GHS',
      name: 'Ghanaian Cedi',
      symbol: 'GH₵',
      flag: '🇬🇭',
      minAmount: 10,
      maxAmount: 200000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    },
    {
      code: 'KES',
      name: 'Kenyan Shilling',
      symbol: 'KSh',
      flag: '🇰🇪',
      minAmount: 100,
      maxAmount: 5000000,
      supportedMethods: ['card', 'bank_transfer'],
      enabled: true,
      settlementSupported: false
    }
  ];

  public nigerianBanks: NigerianBank[] = [
    { name: 'Zenith Bank PLC', code: '057', ussdPrefix: '*966#' },
    { name: 'Guaranty Trust Bank (GTBank)', code: '058', ussdPrefix: '*737#' },
    { name: 'Access Bank PLC', code: '044', ussdPrefix: '*901#' },
    { name: 'First Bank of Nigeria', code: '011', ussdPrefix: '*894#' },
    { name: 'United Bank for Africa (UBA)', code: '033', ussdPrefix: '*919#' },
    { name: 'Stanbic IBTC Bank', code: '221', ussdPrefix: '*909#' },
    { name: 'Fidelity Bank PLC', code: '070', ussdPrefix: '*770#' },
    { name: 'Kuda Microfinance Bank', code: '50211', ussdPrefix: '*50211#' },
    { name: 'Moniepoint MFB', code: '50515', ussdPrefix: '*50515#' },
    { name: 'OPay Digital Services', code: '999992', ussdPrefix: '*955#' }
  ];

  constructor() {
    this.seedDatabase();
  }

  private seedDatabase() {
    // 1. Categories
    this.categories = [
      {
        id: 'services',
        name: 'Services & Trades',
        slug: 'services',
        iconName: 'Wrench',
        description: 'Plumbing, electrical, mechanics, tailors, cleaning, tutors, and maintenance professionals',
        subcategories: ['Plumber', 'Electrician', 'Auto Mechanic', 'Tailor & Fashion Designer', 'Barber & Stylist', 'Home Cleaner', 'Tutor / Instructor', 'Repair Technician'],
        bannerImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'retail',
        name: 'Retail & Commerce',
        slug: 'retail',
        iconName: 'ShoppingBag',
        description: 'Fashion boutiques, electronics, phone gadgets, furniture, building materials, and auto parts',
        subcategories: ['Fashion & Apparel', 'Electronics & Laptops', 'Smartphones & Accessories', 'Home & Office Furniture', 'Building Materials', 'Supermarket & Groceries', 'Auto Spare Parts'],
        bannerImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'food_hospitality',
        name: 'Food, Dining & Events',
        slug: 'food-hospitality',
        iconName: 'Utensils',
        description: 'Restaurants, artisan bakers, custom caterers, food vendors, and party food services',
        subcategories: ['Restaurants & Grills', 'Artisan Bakery', 'Event Catering', 'Street Food & Snacks', 'Private Chef', 'Drink & Cocktail Service'],
        bannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'creative',
        name: 'Creative, Media & Arts',
        slug: 'creative-media',
        iconName: 'Camera',
        description: 'Photographers, videographers, graphic designers, music producers, and event planners',
        subcategories: ['Studio & Event Photography', 'Cinematography & Video', 'Brand Identity & Graphic Design', 'Music & Sound Production', 'Event Planning & Decor'],
        bannerImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'agriculture',
        name: 'Agriculture & Farm Produce',
        slug: 'agriculture',
        iconName: 'Wheat',
        description: 'Commercial farmers, grain distributors, livestock breeders, agro-inputs, and machinery',
        subcategories: ['Crop & Grain Supply', 'Livestock & Poultry', 'Agro-Chemicals & Fertilizers', 'Farm Machinery & Tractors', 'Veterinary Services', 'Organic Produce'],
        bannerImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'professional',
        name: 'Professional & Business Services',
        slug: 'professional-services',
        iconName: 'Briefcase',
        description: 'Legal attorneys, accountants, corporate consulting, logistics freight, and HR agencies',
        subcategories: ['Legal & Corporate Law', 'Accounting & Tax Advisory', 'Management Consulting', 'Logistics & Haulage', 'HR & Recruitment'],
        bannerImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'tech_development',
        name: 'Software, IT & Digital',
        slug: 'tech-software',
        iconName: 'Code',
        description: 'Web development, mobile apps, digital marketing, cybersecurity, and cloud architecture',
        subcategories: ['Full-Stack Web Apps', 'Mobile App Development', 'SEO & Performance Marketing', 'Cloud & DevOps', 'Cybersecurity & Audits'],
        bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80'
      },
      {
        id: 'beauty_wellness',
        name: 'Beauty, Spa & Wellness',
        slug: 'beauty-wellness',
        iconName: 'Sparkles',
        description: 'Skincare specialists, luxury spas, massage therapy, makeup artists, and fitness gyms',
        subcategories: ['Organic Skincare', 'Luxury Spa & Massage', 'Bridal Makeup', 'Fitness & Personal Trainers'],
        bannerImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80'
      }
    ];

    // 2. Subscription Plans
    this.subscriptionPlans = [
      {
        id: 'free',
        displayName: 'Starter Business',
        priceNGN: 0,
        priceUSD: 0,
        billingCycle: 'monthly',
        features: [
          'Standard verified business profile',
          'Up to 3 active advertisements',
          '5 portfolio project showcases',
          'Unlimited customer messaging',
          'Standard payment links & invoices',
          'Basic performance analytics'
        ],
        limits: {
          maxActiveAds: 3,
          maxPortfolioItems: 5,
          maxProducts: 10,
          aiGenerationsPerMonth: 3,
          prioritySearchRanking: false,
          verifiedGoldBadge: false,
          customDomain: false,
          analyticsTier: 'basic'
        }
      },
      {
        id: 'pro',
        displayName: 'Growth Booster Pro',
        priceNGN: 15000,
        priceUSD: 12,
        billingCycle: 'monthly',
        recommended: true,
        features: [
          'High-priority local discovery ranking',
          'Up to 25 active advertisements',
          'Unlimited portfolio showcases with HD video',
          'AI Advertising & Copywriting Assistant',
          '50% discount on boosted ad placements',
          'Verified Blue badge on listings',
          'Advanced customer CRM & export analytics',
          'Custom WhatsApp & Direct Call CTAs'
        ],
        limits: {
          maxActiveAds: 25,
          maxPortfolioItems: 50,
          maxProducts: 100,
          aiGenerationsPerMonth: 100,
          prioritySearchRanking: true,
          verifiedGoldBadge: true,
          customDomain: false,
          analyticsTier: 'advanced'
        }
      },
      {
        id: 'enterprise',
        displayName: 'Enterprise Corporate Suite',
        priceNGN: 45000,
        priceUSD: 35,
        billingCycle: 'monthly',
        features: [
          'Top-tier #1 search & category sponsor placement',
          'Unlimited advertisements & catalog products',
          'Unlimited AI marketing generation & visual prompts',
          'Golden Verified Corporate seal of trust',
          'Dedicated account manager & 24/7 priority support',
          'Multi-staff sub-accounts for sales teams',
          'Automated daily NGN settlement to commercial bank',
          'Full-featured invoicing & recurring billing'
        ],
        limits: {
          maxActiveAds: 999,
          maxPortfolioItems: 500,
          maxProducts: 1000,
          aiGenerationsPerMonth: 9999,
          prioritySearchRanking: true,
          verifiedGoldBadge: true,
          customDomain: true,
          analyticsTier: 'enterprise'
        }
      }
    ];

    // 3. Seed Users with Authentication Passwords and strictly enforced Roles
    const defaultPasswordHash = bcrypt.hashSync('Client123!', 10);
    const adminPasswordHash = bcrypt.hashSync('Admin2026!', 10);

    const ceoUser: UserEntity = {
      id: 'usr_maddy_ceo',
      name: 'Muhammad Kabir Ahmad (Maddy)',
      email: 'maddyahamco00@gmail.com',
      phone: '+2348039876543',
      role: 'SUPER_ADMIN', // STRICT SINGLE SUPER ADMIN
      status: 'ACTIVE',
      tier: 'enterprise',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Founder & CEO of Real Boosters / Boost Market. Empowering African and global businesses with world-class discovery, advertising, and instant settlement.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Real Boosters HQ, Independence Way, Kaduna'
      },
      businessId: 'biz_real_boosters',
      passwordHash: adminPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(ceoUser.id, ceoUser);

    const bizUser1: UserEntity = {
      id: 'usr_farouk_tech',
      name: 'Farouk Usman',
      email: 'farouk@kadunacode.com',
      phone: '+2348021112233',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      bio: 'Lead Architect at Arewa Tech Labs - Building high-performance mobile apps & cloud platforms.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Barnawa Shopping Complex, Kaduna'
      },
      businessId: 'biz_arewa_tech',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser1.id, bizUser1);

    const bizUser2: UserEntity = {
      id: 'usr_amina_couture',
      name: 'Hajiya Amina Bello',
      email: 'amina@zeenatcouture.ng',
      phone: '+2348035557788',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      bio: 'Creative Director at Zeenat Northern Couture - Bespoke Northern Nigerian luxury Kaftans & bridal attire.',
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai Road, Commercial Area, Kano'
      },
      businessId: 'biz_zeenat_couture',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser2.id, bizUser2);

    const bizUser3: UserEntity = {
      id: 'usr_tunde_auto',
      name: 'Babajide Tunde',
      email: 'tunde@apexautolagos.com',
      phone: '+2348083334455',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'enterprise',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      bio: 'Master Certified Automobile Technician & Diagnostic Specialist at Apex Auto Works.',
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: 'Oregun Industrial Area, Ikeja, Lagos'
      },
      businessId: 'biz_apex_auto',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser3.id, bizUser3);

    const bizUser4: UserEntity = {
      id: 'usr_mallam_farms',
      name: 'Alhaji Sani Daurawa',
      email: 'sani@arewafreshfarms.ng',
      phone: '+2348067778899',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'business',
      tier: 'pro',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
      bio: 'Managing Partner at Savannah Agro & Grain Millers - Bulk grain, fertilizer and tractor services.',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Zaria Road Agro Industrial Hub, Kaduna'
      },
      businessId: 'biz_savannah_agro',
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(bizUser4.id, bizUser4);

    const customerUser: UserEntity = {
      id: 'usr_david_customer',
      name: 'David Okonjo',
      email: 'david.okonjo@gmail.com',
      phone: '+2348123456789',
      role: 'CLIENT',
      status: 'ACTIVE',
      clientType: 'customer',
      tier: 'free',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      bio: 'Entrepreneur & Tech enthusiast looking for high-quality verified vendors & services.',
      location: {
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        lat: 9.0765,
        lng: 7.3986,
        address: 'Maitama District, Abuja'
      },
      savedAdIds: ['ad_zeenat_kaftan', 'ad_arewa_dev'],
      savedBusinessIds: ['biz_real_boosters', 'biz_zeenat_couture'],
      passwordHash: defaultPasswordHash,
      emailVerifiedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(customerUser.id, customerUser);

    // Enforce Super Admin Invariant check at startup
    this.enforceSuperAdminInvariant();

    // 4. Seed Businesses
    const bizRealBoosters: Business = {
      id: 'biz_real_boosters',
      ownerId: 'usr_maddy_ceo',
      name: 'Real Boosters Agency',
      slug: 'real-boosters',
      tagline: 'Premier Business Growth, Performance Advertising & Digital Marketing Agency',
      description: 'Real Boosters is the flagship venture led by Muhammad Kabir Ahmad (Maddy). We empower businesses with comprehensive digital transformation, brand design, targeted social advertising, SEO optimization, and corporate SaaS technology integration.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
      category: 'professional',
      categoryLabel: 'Professional & Digital Marketing Agency',
      subcategories: ['Brand Strategy', 'Performance Marketing', 'Corporate SaaS', 'Social Ads Campaign', 'SEO Optimization'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Plot 4, Independence Way, Commercial Central, Kaduna',
        serviceAreaKm: 100
      },
      phone: '+2348039876543',
      whatsapp: '+2348039876543',
      email: 'maddyahamco00@gmail.com',
      website: 'https://realboosters.com',
      openingHours: [
        { day: 'Mon - Fri', hours: '08:00 AM - 06:00 PM', isOpen: true },
        { day: 'Saturday', hours: '09:00 AM - 04:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'Closed', isOpen: false }
      ],
      rating: 4.9,
      reviewCount: 48,
      isVerified: true,
      tier: 'enterprise',
      featured: true,
      stats: {
        views: 18450,
        leads: 320,
        conversions: 89,
        totalRevenue: 6750000
      },
      socialLinks: {
        whatsapp: 'https://wa.me/2348039876543',
        instagram: 'https://instagram.com/realboosters',
        twitter: 'https://twitter.com/realboosters',
        linkedin: 'https://linkedin.com/company/realboosters'
      },
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    };
    this.businesses.set(bizRealBoosters.id, bizRealBoosters);

    const bizArewaTech: Business = {
      id: 'biz_arewa_tech',
      ownerId: 'usr_farouk_tech',
      name: 'Arewa Tech Labs',
      slug: 'arewa-tech-labs',
      tagline: 'Custom Full-Stack Web, Mobile Apps & Enterprise Cloud Software',
      description: 'We craft high-performance web applications, iOS/Android mobile solutions, payment gateway integrations (Flutterwave/Paystack), and modern SaaS cloud platforms for growing companies across Nigeria and the UK/US diaspora.',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
      category: 'tech_development',
      categoryLabel: 'Software & Cloud Engineering',
      subcategories: ['Full-Stack Web Apps', 'Mobile App Development', 'Flutterwave Integration', 'Cloud Architecture'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Suite 12, Barnawa Complex, Kaduna South',
        serviceAreaKm: 250
      },
      phone: '+2348021112233',
      whatsapp: '+2348021112233',
      email: 'farouk@kadunacode.com',
      website: 'https://arewatechlabs.io',
      openingHours: [
        { day: 'Mon - Sat', hours: '08:30 AM - 07:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'Remote on demand', isOpen: true }
      ],
      rating: 4.8,
      reviewCount: 32,
      isVerified: true,
      tier: 'pro',
      featured: true,
      stats: {
        views: 12300,
        leads: 185,
        conversions: 42,
        totalRevenue: 4200000
      },
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    };
    this.businesses.set(bizArewaTech.id, bizArewaTech);

    const bizZeenat: Business = {
      id: 'biz_zeenat_couture',
      ownerId: 'usr_amina_couture',
      name: 'Zeenat Northern Couture & Bridal',
      slug: 'zeenat-northern-couture',
      tagline: 'Luxury Northern Attire, Royal Kaftans, Handcrafted Aso-Ebi & Bridal Wear',
      description: 'Zeenat Northern Couture is a celebrated fashion house crafting custom embroidered Kaftans, flowing Babbar Riga, luxury silk veils, and bespoke bridal wardrobes using genuine European cashmere and pure cotton fabrics.',
      logoUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80',
      category: 'retail',
      categoryLabel: 'Fashion & Bespoke Tailoring',
      subcategories: ['Fashion & Apparel', 'Bespoke Tailoring', 'Bridal Attire', 'Luxury Kaftans'],
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai GRA, Commercial Arcade, Kano',
        serviceAreaKm: 500
      },
      phone: '+2348035557788',
      whatsapp: '+2348035557788',
      email: 'amina@zeenatcouture.ng',
      website: 'https://zeenatcouture.ng',
      openingHours: [
        { day: 'Mon - Sat', hours: '09:00 AM - 08:00 PM', isOpen: true },
        { day: 'Sunday', hours: 'By Appointment Only', isOpen: false }
      ],
      rating: 5.0,
      reviewCount: 64,
      isVerified: true,
      tier: 'pro',
      featured: true,
      stats: {
        views: 22100,
        leads: 410,
        conversions: 128,
        totalRevenue: 8900000
      },
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString()
    };
    this.businesses.set(bizZeenat.id, bizZeenat);

    const bizApexAuto: Business = {
      id: 'biz_apex_auto',
      ownerId: 'usr_tunde_auto',
      name: 'Apex Auto Diagnostics & Engineering',
      slug: 'apex-auto-lagos',
      tagline: 'German & Japanese Vehicle Computer Diagnostics, Engine Rebuilding & AC Overhaul',
      description: 'State-of-the-art auto engineering garage equipped with OEM computerized diagnostic tools (Autel/Launch), certified master technicians, genuine replacement parts, and emergency mobile breakdown recovery across Lagos.',
      logoUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop&q=80',
      category: 'services',
      categoryLabel: 'Automobile Engineering & Diagnostics',
      subcategories: ['Auto Mechanic', 'Computer Diagnostics', 'Auto Spare Parts', 'Mobile Breakdown Recovery'],
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: '45 Kudirat Abiola Way, Oregun, Ikeja, Lagos',
        serviceAreaKm: 40
      },
      phone: '+2348083334455',
      whatsapp: '+2348083334455',
      email: 'tunde@apexautolagos.com',
      website: 'https://apexautolagos.com',
      openingHours: [
        { day: 'Mon - Sat', hours: '08:00 AM - 06:30 PM', isOpen: true },
        { day: 'Sunday', hours: 'Emergency Breakdown Callouts', isOpen: true }
      ],
      rating: 4.9,
      reviewCount: 51,
      isVerified: true,
      tier: 'enterprise',
      featured: true,
      stats: {
        views: 15700,
        leads: 290,
        conversions: 110,
        totalRevenue: 5400000
      },
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    };
    this.businesses.set(bizApexAuto.id, bizApexAuto);

    const bizSavannahAgro: Business = {
      id: 'biz_savannah_agro',
      ownerId: 'usr_mallam_farms',
      name: 'Savannah Agro Mills & Machinery',
      slug: 'savannah-agro-kaduna',
      tagline: 'Wholesale Grain Supply, Soya Millers, Certified Seeds & Tractor Leasing',
      description: 'Direct farm-gate supply of high-grade dried maize, clean soya beans, sorghum, NPK fertilizers, and mechanized tractor plowing services for commercial farms in Kaduna, Kano, and Plateau States.',
      logoUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80',
      category: 'agriculture',
      categoryLabel: 'Agriculture & Farm Equipment',
      subcategories: ['Crop & Grain Supply', 'Agro-Chemicals & Fertilizers', 'Farm Machinery & Tractors', 'Livestock Feed'],
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Km 14 Zaria Express Highway, Rigachikun, Kaduna',
        serviceAreaKm: 300
      },
      phone: '+2348067778899',
      whatsapp: '+2348067778899',
      email: 'sani@arewafreshfarms.ng',
      website: 'https://savannahagro.ng',
      openingHours: [
        { day: 'Mon - Fri', hours: '07:30 AM - 05:30 PM', isOpen: true },
        { day: 'Saturday', hours: '08:00 AM - 02:00 PM', isOpen: true }
      ],
      rating: 4.7,
      reviewCount: 28,
      isVerified: true,
      tier: 'pro',
      featured: false,
      stats: {
        views: 9400,
        leads: 140,
        conversions: 35,
        totalRevenue: 12500000
      },
      createdAt: new Date(Date.now() - 40 * 86400000).toISOString()
    };
    this.businesses.set(bizSavannahAgro.id, bizSavannahAgro);

    // 5. Seed Products & Services
    const p1: Product = {
      id: 'prod_royal_kaftan',
      businessId: 'biz_zeenat_couture',
      name: 'Royal Northern Gold-Embroidered Kaftan (3-Piece Set)',
      description: 'Hand-tailored 100% fine cotton Kaftan featuring intricate gold thread neckline embroidery, matching trousers, and lightweight ceremonial cap.',
      price: 85000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80'],
      category: 'Fashion & Apparel',
      inStock: true,
      sku: 'ZNT-KFT-001',
      createdAt: new Date().toISOString()
    };
    this.products.set(p1.id, p1);

    const p2: Product = {
      id: 'prod_soya_beans',
      businessId: 'biz_savannah_agro',
      name: 'Clean Dried Soya Beans (100kg Jute Bag)',
      description: 'Grade-A cleaned yellow soya beans, moisture level < 10%, perfect for commercial feed mills and food processing plants.',
      price: 68000,
      currency: 'NGN',
      imageUrls: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'],
      category: 'Crop & Grain Supply',
      inStock: true,
      sku: 'SVN-SOY-100',
      createdAt: new Date().toISOString()
    };
    this.products.set(p2.id, p2);

    const s1: Service = {
      id: 'serv_saas_ad_campaign',
      businessId: 'biz_real_boosters',
      name: '30-Day Omnichannel Boost Ad & Lead Generation Package',
      description: 'Complete campaign setup: targeted Meta & Google ads, copywriting, creative design, conversion tracking, and 24/7 analytics monitoring.',
      startingPrice: 150000,
      currency: 'NGN',
      durationUnit: 'per month',
      imageUrls: ['https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&auto=format&fit=crop&q=80'],
      category: 'Performance Marketing',
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    this.services.set(s1.id, s1);

    const s2: Service = {
      id: 'serv_mobile_app_dev',
      businessId: 'biz_arewa_tech',
      name: 'Custom Mobile Application (React Native / Flutter) MVP',
      description: 'End-to-end mobile development including UI/UX design, real-time backend API, payment integration, and App Store / Play Store deployment.',
      startingPrice: 850000,
      currency: 'NGN',
      durationUnit: 'per project (4 weeks)',
      imageUrls: ['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80'],
      category: 'Software & Cloud Engineering',
      deliveryMode: 'remote',
      createdAt: new Date().toISOString()
    };
    this.services.set(s2.id, s2);

    const s3: Service = {
      id: 'serv_auto_diagnostics',
      businessId: 'biz_apex_auto',
      name: 'Full Vehicle OBD-II Computer Diagnostics & Live Sensor Inspection',
      description: 'Complete 120-point digital scan including engine ECU, transmission, ABS, airbag modules, and live fuel trim graphs with printable technician report.',
      startingPrice: 25000,
      currency: 'NGN',
      durationUnit: 'per vehicle',
      imageUrls: ['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80'],
      category: 'Automobile Engineering & Diagnostics',
      deliveryMode: 'on-premise',
      createdAt: new Date().toISOString()
    };
    this.services.set(s3.id, s3);

    // 6. Seed Advertisements
    const ad1: Advertisement = {
      id: 'ad_real_boosters_growth',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'professional',
      title: 'Double Your Customer Enquiries & Revenue with Boost Market Ads',
      description: 'Ready to scale your business in Kaduna, Abuja, Lagos and beyond? Real Boosters creates high-converting digital advertising campaigns, interactive catalogs, and automated WhatsApp CRM systems tailored to your industry.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Professional & Business Services',
      subcategory: 'Performance Marketing',
      price: 150000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5105,
        lng: 7.4165,
        address: 'Independence Way, Kaduna'
      },
      tags: ['Marketing', 'Ads', 'Business Growth', 'Kaduna', 'Real Boosters'],
      targetRadiusKm: 50,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'homepage',
        durationDays: 30,
        budgetNGN: 45000,
        expiresAt: new Date(Date.now() + 25 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
      viewsCount: 4210,
      clicksCount: 384,
      enquiriesCount: 68,
      contactPhone: '+2348039876543',
      contactWhatsApp: '+2348039876543',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    };
    this.advertisements.set(ad1.id, ad1);

    const ad2: Advertisement = {
      id: 'ad_zeenat_kaftan',
      businessId: 'biz_zeenat_couture',
      businessName: 'Zeenat Northern Couture & Bridal',
      businessLogo: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'retail',
      title: 'Exclusive 2026 Northern Royal Kaftan & Aso-Ebi Collection',
      description: 'Step out in unmatched elegance. Hand-stitched with authentic Swiss Voile & Cashmere fabrics. Custom tailoring dispatched nationwide within 5 business days with door-to-door DHL delivery.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Retail & Commerce',
      subcategory: 'Fashion & Apparel',
      price: 85000,
      currency: 'NGN',
      location: {
        city: 'Kano',
        state: 'Kano State',
        country: 'Nigeria',
        lat: 12.0022,
        lng: 8.5920,
        address: 'Bompai GRA, Kano'
      },
      tags: ['Fashion', 'Kaftan', 'Bridal', 'Kano', 'Luxury'],
      targetRadiusKm: 100,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'featured',
        durationDays: 14,
        budgetNGN: 25000,
        expiresAt: new Date(Date.now() + 10 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      viewsCount: 3120,
      clicksCount: 295,
      enquiriesCount: 52,
      contactPhone: '+2348035557788',
      contactWhatsApp: '+2348035557788',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    };
    this.advertisements.set(ad2.id, ad2);

    const ad3: Advertisement = {
      id: 'ad_arewa_dev',
      businessId: 'biz_arewa_tech',
      businessName: 'Arewa Tech Labs',
      businessLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'tech_development',
      title: 'Launch Your Business Mobile App & Web Portal in 21 Days',
      description: 'Get a modern, fast, and secure mobile application for iOS and Android with automated Flutterwave & Paystack checkout, push notifications, and admin dashboard. Free 3-month maintenance included.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Software, IT & Digital',
      subcategory: 'Mobile App Development',
      price: 850000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.5230,
        lng: 7.4380,
        address: 'Barnawa, Kaduna'
      },
      tags: ['Mobile App', 'Web Development', 'Flutterwave', 'Kaduna Tech'],
      targetRadiusKm: 50,
      status: 'active',
      isBoosted: false,
      expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
      viewsCount: 1980,
      clicksCount: 160,
      enquiriesCount: 24,
      contactPhone: '+2348021112233',
      contactWhatsApp: '+2348021112233',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    };
    this.advertisements.set(ad3.id, ad3);

    const ad4: Advertisement = {
      id: 'ad_apex_diagnostics',
      businessId: 'biz_apex_auto',
      businessName: 'Apex Auto Diagnostics',
      businessLogo: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'services',
      title: 'Fix Check Engine Lights & Auto Electrical Faults with Precision',
      description: 'Avoid trial-and-error repairs. We diagnose all Mercedes, BMW, Toyota, Honda, and Ford error codes with OEM dealership equipment in Ikeja, Lagos. Fast 45-minute turnaround.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Services & Trades',
      subcategory: 'Auto Mechanic',
      price: 25000,
      currency: 'NGN',
      location: {
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        lat: 6.5244,
        lng: 3.3792,
        address: 'Kudirat Abiola Way, Ikeja, Lagos'
      },
      tags: ['Auto Repair', 'Mechanic', 'Check Engine', 'Lagos'],
      targetRadiusKm: 25,
      status: 'active',
      isBoosted: true,
      boostPlan: {
        type: 'category_top',
        durationDays: 7,
        budgetNGN: 15000,
        expiresAt: new Date(Date.now() + 5 * 86400000).toISOString()
      },
      expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      viewsCount: 2540,
      clicksCount: 210,
      enquiriesCount: 44,
      contactPhone: '+2348083334455',
      contactWhatsApp: '+2348083334455',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    };
    this.advertisements.set(ad4.id, ad4);

    const ad5: Advertisement = {
      id: 'ad_savannah_soya',
      businessId: 'biz_savannah_agro',
      businessName: 'Savannah Agro Mills',
      businessLogo: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=200&auto=format&fit=crop&q=80',
      businessCategory: 'agriculture',
      title: 'Bulk Premium Clean Dried Soya Beans & Maize (Truckload Supply)',
      description: 'Direct wholesale delivery from farm silos to processing plants across Nigeria. Moisture tested, stones removed, certified 100kg bags. Special bulk pricing for 10-ton to 30-ton orders.',
      mediaUrls: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80'
      ],
      mediaType: 'image',
      category: 'Agriculture & Farm Produce',
      subcategory: 'Crop & Grain Supply',
      price: 68000,
      currency: 'NGN',
      location: {
        city: 'Kaduna',
        state: 'Kaduna State',
        country: 'Nigeria',
        lat: 10.6050,
        lng: 7.4520,
        address: 'Zaria Road, Kaduna'
      },
      tags: ['Agriculture', 'Soya Beans', 'Grain Millers', 'Wholesale', 'Kaduna'],
      targetRadiusKm: 200,
      status: 'active',
      isBoosted: false,
      expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
      viewsCount: 1420,
      clicksCount: 88,
      enquiriesCount: 19,
      contactPhone: '+2348067778899',
      contactWhatsApp: '+2348067778899',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    };
    this.advertisements.set(ad5.id, ad5);

    // 7. Seed Portfolio Items
    const pf1: PortfolioItem = {
      id: 'pf_real_boosters_1',
      businessId: 'biz_real_boosters',
      title: 'Northern Agro Summit 2025 - 400% Lead Acceleration Campaign',
      description: 'Delivered end-to-end digital advertising generating 1,200 qualified agribusiness attendees across 8 Northern states in 14 days.',
      category: 'Performance Marketing',
      mediaUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'Northern Agro Council',
      dateCompleted: 'November 2025',
      tags: ['Digital Ads', 'Social Marketing', 'Agribusiness']
    };
    this.portfolioItems.set(pf1.id, pf1);

    const pf2: PortfolioItem = {
      id: 'pf_zeenat_bridal',
      businessId: 'biz_zeenat_couture',
      title: 'Royal Kano Wedding - 12 Bespoke Velvet & Silk Ensembles',
      description: 'Designed and hand-embroidered complete bridal wardrobe for high-profile wedding in Kano, featuring Swarovski crystals and gold Zari work.',
      category: 'Bridal Fashion',
      mediaUrl: 'https://images.unsplash.com/photo-1546804784-896d0d517245?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'Aliyu & Fatima Royal Wedding',
      dateCompleted: 'January 2026',
      tags: ['Couture', 'Bridal Wear', 'Hand Embroidery']
    };
    this.portfolioItems.set(pf2.id, pf2);

    const pf3: PortfolioItem = {
      id: 'pf_arewa_fintech',
      businessId: 'biz_arewa_tech',
      title: 'QuickPay Merchant Wallet - iOS & Android Mobile App',
      description: 'Engineered a multi-currency payment wallet processing over ₦50M monthly with Flutterwave webhooks, biometric login, and offline QR scanning.',
      category: 'Mobile App',
      mediaUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      clientName: 'QuickPay Microfinance',
      dateCompleted: 'December 2025',
      tags: ['Fintech', 'React Native', 'Flutterwave API']
    };
    this.portfolioItems.set(pf3.id, pf3);

    const pf4: PortfolioItem = {
      id: 'pf_apex_engine_rebuild',
      businessId: 'biz_apex_auto',
      title: 'Mercedes-Benz E350 V6 Engine Overhaul & ECU Tuning',
      description: 'Full mechanical teardown, piston rings replacement, timing chain recalibration, and ECU remap restoring factory horsepower and 28% fuel efficiency gain.',
      category: 'Engine Rebuild',
      mediaUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=80',
      secondaryMediaUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      isBeforeAfter: true,
      beforeLabel: 'Worn Timing & Carbon Sludge',
      afterLabel: 'Precision Rebuilt & Dyno Tuned',
      clientName: 'Corporate Fleet Client',
      dateCompleted: 'January 2026',
      tags: ['Engine Overhaul', 'Mercedes-Benz', 'Diagnostics', 'Before & After']
    };
    this.portfolioItems.set(pf4.id, pf4);

    // 7.1 Seed Multi-Platform Campaigns
    const camp1: MultiPlatformCampaign = {
      id: 'camp_rb_omnichannel_1',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      title: 'Q1 High-Ticket SME Customer Acquisition Blitz',
      objective: 'more_leads',
      targetLocation: {
        name: 'Kaduna, Abuja & Kano Metros',
        radiusKm: 150,
        lat: 10.5105,
        lng: 7.4165
      },
      audience: {
        minAge: 25,
        maxAge: 55,
        gender: 'all',
        interests: ['Entrepreneurship', 'Small Business Growth', 'E-commerce', 'Wholesale Trade'],
        languages: ['English', 'Hausa']
      },
      totalBudgetNGN: 180000,
      adSpendBudgetNGN: 165000,
      platformFeeNGN: 15000,
      durationDays: 14,
      startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 9 * 86400000).toISOString(),
      status: 'active',
      selectedPlatforms: ['facebook', 'instagram', 'google', 'tiktok'],
      platformAllocations: [
        {
          platform: 'facebook',
          allocatedBudgetNGN: 60000,
          percentage: 36,
          estimatedReachMin: 45000,
          estimatedReachMax: 85000,
          estimatedClicksMin: 950,
          estimatedClicksMax: 1800,
          spentAmountNGN: 24500,
          impressions: 34200,
          reach: 22800,
          clicks: 640,
          leads: 28,
          conversions: 8,
          status: 'active'
        },
        {
          platform: 'instagram',
          allocatedBudgetNGN: 45000,
          percentage: 27,
          estimatedReachMin: 30000,
          estimatedReachMax: 60000,
          estimatedClicksMin: 600,
          estimatedClicksMax: 1200,
          spentAmountNGN: 18200,
          impressions: 21500,
          reach: 16400,
          clicks: 410,
          leads: 19,
          conversions: 5,
          status: 'active'
        },
        {
          platform: 'google',
          allocatedBudgetNGN: 40000,
          percentage: 25,
          estimatedReachMin: 15000,
          estimatedReachMax: 35000,
          estimatedClicksMin: 500,
          estimatedClicksMax: 900,
          spentAmountNGN: 15600,
          impressions: 11200,
          reach: 9800,
          clicks: 380,
          leads: 16,
          conversions: 6,
          status: 'active'
        },
        {
          platform: 'tiktok',
          allocatedBudgetNGN: 20000,
          percentage: 12,
          estimatedReachMin: 25000,
          estimatedReachMax: 70000,
          estimatedClicksMin: 400,
          estimatedClicksMax: 1100,
          spentAmountNGN: 8100,
          impressions: 29800,
          reach: 19500,
          clicks: 310,
          leads: 11,
          conversions: 2,
          status: 'active'
        }
      ],
      dailySpendCapNGN: 13000,
      spentSoFarNGN: 66400,
      remainingBudgetNGN: 98600,
      headline: 'Scale Your Business With Automated Leads & Multi-Platform Ads',
      primaryText: 'Stop wasting money on random boosting. Real Boosters deploys AI-targeted campaigns across Facebook, Instagram, Google, and TikTok that deliver verified buyer enquiries directly to your WhatsApp.',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      callToAction: 'Get Free Marketing Audit',
      destinationUrl: 'https://realboosters.com/audit',
      leadsCount: 74,
      conversionsCount: 21,
      costPerLeadNGN: 897,
      paymentId: 'pay_camp_001',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.campaigns.set(camp1.id, camp1);

    // 7.2 Seed CRM Leads
    const lead1: Lead = {
      id: 'lead_001',
      businessId: 'biz_real_boosters',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      customerPhone: '+2348039876543',
      customerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      source: 'boost_market',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'invoice_sent',
      estimatedValueNGN: 150000,
      notes: 'Interested in 30-day omnichannel advertising for Abuja expansion. Invoice BM-INV-2026-0891 sent.',
      lastContactedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      conversationId: 'conv_david_maddy',
      invoiceId: 'inv_001',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead1.id, lead1);

    const lead2: Lead = {
      id: 'lead_002',
      businessId: 'biz_real_boosters',
      customerId: 'usr_hajia_fatima',
      customerName: 'Hajia Fatima Balarabe',
      customerEmail: 'fatima.balarabe@kanotrade.ng',
      customerPhone: '+2348031234567',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      source: 'instagram',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'qualified',
      estimatedValueNGN: 350000,
      notes: 'Textile manufacturing company in Kano looking for nationwide distributor acquisition.',
      lastContactedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead2.id, lead2);

    const lead3: Lead = {
      id: 'lead_003',
      businessId: 'biz_real_boosters',
      customerId: 'usr_tunde_auto',
      customerName: 'Engr. Babatunde Adeleke',
      customerEmail: 'tunde@adeleke-engineering.com',
      customerPhone: '+2348028889900',
      customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      source: 'google',
      campaignId: 'camp_rb_omnichannel_1',
      status: 'new',
      estimatedValueNGN: 500000,
      notes: 'Industrial generator maintenance company seeking corporate leads in Kaduna and Abuja.',
      lastContactedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.leads.set(lead3.id, lead3);

    // 8. Seed Invoices
    const inv1: Invoice = {
      id: 'inv_001',
      invoiceNumber: 'BM-INV-2026-0891',
      businessId: 'biz_real_boosters',
      businessName: 'Real Boosters Agency',
      businessLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      description: 'Monthly Boost Market Growth Advertising Package & CRM Integration',
      items: [
        { id: 'item_1', description: 'Performance Advertising Setup & Optimization', quantity: 1, unitPrice: 120000, amount: 120000 },
        { id: 'item_2', description: 'Custom Creative Design & Video Reels (4 sets)', quantity: 1, unitPrice: 30000, amount: 30000 }
      ],
      subtotal: 150000,
      taxPercent: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 150000,
      currency: 'NGN',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'sent',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    };
    this.invoices.set(inv1.id, inv1);

    const inv2: Invoice = {
      id: 'inv_002',
      invoiceNumber: 'BM-INV-2026-0742',
      businessId: 'biz_zeenat_couture',
      businessName: 'Zeenat Northern Couture',
      businessLogo: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&auto=format&fit=crop&q=80',
      customerId: 'usr_david_customer',
      customerName: 'David Okonjo',
      customerEmail: 'david.okonjo@gmail.com',
      description: 'Custom Gold-Embroidered Kaftan Set & Express Courier Delivery',
      items: [
        { id: 'item_1', description: 'Bespoke Royal Kaftan 3-Piece Set', quantity: 1, unitPrice: 85000, amount: 85000 },
        { id: 'item_2', description: 'DHL Express Door Delivery (Kano -> Abuja)', quantity: 1, unitPrice: 5000, amount: 5000 }
      ],
      subtotal: 90000,
      taxPercent: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 90000,
      currency: 'NGN',
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      status: 'paid',
      paymentMethod: 'Flutterwave Card',
      transactionRef: 'FLW_MOCK_88291039',
      paidAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    };
    this.invoices.set(inv2.id, inv2);

    // 9. Seed Conversations & Messages
    const conv1: Conversation = {
      id: 'conv_david_maddy',
      participants: ['usr_david_customer', 'usr_maddy_ceo'],
      participantDetails: [
        { id: 'usr_david_customer', name: 'David Okonjo', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80', role: 'customer' },
        { id: 'usr_maddy_ceo', name: 'Muhammad Kabir Ahmad (Maddy)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', role: 'ceo', businessName: 'Real Boosters Agency', online: true }
      ],
      unreadCount: 1,
      updatedAt: new Date().toISOString()
    };
    this.conversations.set(conv1.id, conv1);

    const msg1: ChatMessage = {
      id: 'msg_1',
      conversationId: 'conv_david_maddy',
      senderId: 'usr_david_customer',
      senderName: 'David Okonjo',
      text: 'Hello Maddy! I saw your Boost Market advertisement. We want to run a targeted advertising campaign for our new branch in Abuja.',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    };
    this.messages.set(msg1.id, msg1);

    const msg2: ChatMessage = {
      id: 'msg_2',
      conversationId: 'conv_david_maddy',
      senderId: 'usr_maddy_ceo',
      senderName: 'Muhammad Kabir Ahmad (Maddy)',
      text: 'Salam David! Absolutely, Real Boosters has extensive reach in Abuja and Northern business corridors. I have generated a custom invoice with our 30-Day Omnichannel Boost package below.',
      invoiceRef: inv1,
      deliveryStatus: 'delivered',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    };
    this.messages.set(msg2.id, msg2);

    conv1.lastMessage = msg2;

    // 10. Seed Notifications
    const notif1: PushNotification = {
      id: 'notif_1',
      userId: 'usr_maddy_ceo',
      title: 'New Customer Enquiry',
      message: 'David Okonjo sent a message regarding your Real Boosters advertising campaign.',
      type: 'message',
      read: false,
      link: '/messages',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    };
    this.notifications.set(notif1.id, notif1);

    const notif2: PushNotification = {
      id: 'notif_2',
      userId: 'usr_amina_couture',
      title: 'Payment Received (₦90,000)',
      message: 'Invoice BM-INV-2026-0742 paid by David Okonjo via Flutterwave. Settled to Zenith Bank.',
      type: 'payment',
      read: true,
      link: '/merchant',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    };
    this.notifications.set(notif2.id, notif2);

    const notif3: PushNotification = {
      id: 'notif_3',
      userId: 'usr_maddy_ceo',
      title: 'Advertisement Boost Active',
      message: 'Your ad "Double Your Customer Enquiries" is currently boosted on Homepage Spotlight.',
      type: 'ad_status',
      read: true,
      link: '/merchant',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    };
    this.notifications.set(notif3.id, notif3);

    // 11. Seed Reviews
    const rev1: Review = {
      id: 'rev_1',
      businessId: 'biz_real_boosters',
      authorId: 'usr_farouk_tech',
      authorName: 'Farouk Usman',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'Real Boosters transformed our software agency leads. Maddy and his team set up our advertising campaigns and we gained 4 corporate clients in week one!',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    };
    this.reviews.set(rev1.id, rev1);

    const rev2: Review = {
      id: 'rev_2',
      businessId: 'biz_zeenat_couture',
      authorId: 'usr_david_customer',
      authorName: 'David Okonjo',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      rating: 5,
      comment: 'The quality of the Kaftan is breathtaking. Perfectly fitted, premium fabric, and received the invoice and paid through Boost Market smoothly.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    };
    this.reviews.set(rev2.id, rev2);

    // 12. Seed Merchant for Financial Integration
    const merchantMaddy: Merchant = {
      id: 'mer_real_boosters',
      businessName: 'Real Boosters Agency Ltd',
      email: 'maddyahamco00@gmail.com',
      country: 'Nigeria',
      settlementCurrency: 'NGN',
      settlementBank: 'Zenith Bank PLC',
      settlementBankCode: '057',
      settlementAccountNumber: '1018892044',
      settlementAccountName: 'REAL BOOSTERS ENTERPRISE',
      verificationStatus: 'verified',
      kycTier: 'corporate_tier_3',
      dailyLimitNGN: 50000000,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.merchants.set(merchantMaddy.id, merchantMaddy);
  }

  public getUserByEmail(email: string): UserEntity | undefined {
    if (!email) return undefined;
    const normalized = email.toLowerCase().trim();
    return Array.from(this.users.values()).find(u => u.email.toLowerCase().trim() === normalized);
  }

  public enforceSuperAdminInvariant(): void {
    const SUPER_ADMIN_EMAIL = 'maddyahamco00@gmail.com';
    const SUPER_ADMIN_ID = 'usr_maddy_ceo';

    // 1. Ensure no user other than Maddy has role SUPER_ADMIN
    for (const user of this.users.values()) {
      if (user.email.toLowerCase().trim() !== SUPER_ADMIN_EMAIL && user.role === 'SUPER_ADMIN') {
        console.warn(`[Security Invariant Violation] Demoting unauthorized super admin: ${user.email} -> CLIENT`);
        user.role = 'CLIENT';
      }
    }

    // 2. Ensure Maddy exists as SUPER_ADMIN
    let maddy = this.users.get(SUPER_ADMIN_ID) || this.getUserByEmail(SUPER_ADMIN_EMAIL);
    if (!maddy) {
      maddy = {
        id: SUPER_ADMIN_ID,
        name: 'Muhammad Kabir Ahmad (Maddy)',
        email: SUPER_ADMIN_EMAIL,
        phone: '+2348030000000',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        tier: 'enterprise',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Founder & CEO of Real Boosters / Boost Market. Empowering African and global businesses with world-class discovery, advertising, and instant settlement.',
        location: {
          city: 'Kaduna',
          state: 'Kaduna State',
          country: 'Nigeria',
          lat: 10.5105,
          lng: 7.4165,
          address: 'Real Boosters HQ, Independence Way, Kaduna'
        },
        businessId: 'biz_real_boosters',
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.users.set(maddy.id, maddy);
    } else {
      maddy.role = 'SUPER_ADMIN';
    }
  }

  public getPlatformStats(): PlatformStats {
    let totalVol = 0;
    for (const inv of this.invoices.values()) {
      if (inv.status === 'paid') totalVol += inv.total;
    }
    for (const p of this.payments.values()) {
      if (p.status === 'successful') totalVol += p.baseAmountNGN;
    }

    let boosted = 0;
    let active = 0;
    for (const ad of this.advertisements.values()) {
      if (ad.status === 'active') active++;
      if (ad.isBoosted) boosted++;
    }

    let verified = 0;
    for (const b of this.businesses.values()) {
      if (b.isVerified) verified++;
    }

    return {
      totalUsers: this.users.size + 148,
      totalBusinesses: this.businesses.size + 85,
      activeAds: active + 210,
      totalVolumeNGN: totalVol + 38500000,
      totalInvoicesPaid: 142,
      mrrNGN: 2450000,
      boostedAdsCount: boosted + 46,
      verifiedBusinessesCount: verified + 72
    };
  }
}

export const db = new DatabaseStore();
