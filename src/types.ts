export type SupportedCurrency = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'ZAR' | 'KES' | 'GHS';

export type UserRole = 'customer' | 'business' | 'admin' | 'ceo';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export type AdStatus = 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'rejected';

export type BusinessCategoryType = 
  | 'services'
  | 'retail'
  | 'food_hospitality'
  | 'creative'
  | 'agriculture'
  | 'professional'
  | 'tech_development'
  | 'automotive'
  | 'beauty_wellness'
  | 'real_estate'
  | 'education';

export interface LocationCoordinates {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  address?: string;
  serviceAreaKm?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tier: SubscriptionTier;
  avatarUrl?: string;
  bio?: string;
  location?: LocationCoordinates;
  businessId?: string;
  savedAdIds?: string[];
  savedBusinessIds?: string[];
  createdAt: string;
}

export interface OpeningHour {
  day: string;
  hours: string;
  isOpen: boolean;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  category: BusinessCategoryType;
  categoryLabel: string;
  subcategories: string[];
  location: LocationCoordinates;
  phone: string;
  whatsapp?: string;
  email: string;
  website?: string;
  openingHours: OpeningHour[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  tier: SubscriptionTier;
  socialLinks?: SocialLinks;
  stats: {
    views: number;
    leads: number;
    conversions: number;
    totalRevenue: number;
  };
  featured: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
  category: string;
  inStock: boolean;
  sku?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  startingPrice: number;
  currency: string;
  durationUnit: string;
  imageUrls: string[];
  category: string;
  deliveryMode: 'on-premise' | 'remote' | 'at-client';
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  businessId: string;
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  imageUrl?: string;
  secondaryMediaUrl?: string; // For before/after comparisons
  mediaType: 'image' | 'video';
  isBeforeAfter?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  clientName?: string;
  dateCompleted?: string;
  tags: string[];
  projectUrl?: string;
  featured?: boolean;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
}

export type AdvertisingObjective = 
  | 'more_messages'
  | 'more_website_visitors'
  | 'more_leads'
  | 'more_calls'
  | 'more_product_sales'
  | 'more_local_customers'
  | 'brand_awareness'
  | 'whatsapp_orders'
  | 'brand_discovery'
  | 'store_traffic'
  | 'app_installs';

export type SupportedAdPlatform = 'facebook' | 'instagram' | 'youtube' | 'google' | 'tiktok';

export interface PlatformAllocation {
  platform: SupportedAdPlatform;
  allocatedBudgetNGN: number;
  percentage: number;
  estimatedReachMin: number;
  estimatedReachMax: number;
  estimatedClicksMin: number;
  estimatedClicksMax: number;
  spentAmountNGN: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  conversions: number;
  status: 'active' | 'paused' | 'completed';
}

export interface MultiPlatformCampaign {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  title: string;
  objective: AdvertisingObjective;
  targetLocation: {
    name: string;
    radiusKm: number;
    lat?: number;
    lng?: number;
  };
  audience: {
    minAge: number;
    maxAge: number;
    gender: 'all' | 'men' | 'women';
    interests: string[];
    languages: string[];
  };
  totalBudgetNGN: number;
  adSpendBudgetNGN: number;
  platformFeeNGN: number;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'pending_payment' | 'active' | 'paused' | 'completed' | 'cancelled';
  selectedPlatforms: SupportedAdPlatform[];
  platformAllocations: PlatformAllocation[];
  dailySpendCapNGN: number;
  spentSoFarNGN: number;
  remainingBudgetNGN: number;
  headline: string;
  primaryText: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  callToAction: string;
  destinationUrl: string;
  leadsCount: number;
  conversionsCount: number;
  costPerLeadNGN: number;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'quotation_sent'
  | 'invoice_sent'
  | 'paid'
  | 'lost'
  | 'converted';

export interface Lead {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAvatar?: string;
  source: 'direct' | 'boost_market' | 'facebook' | 'instagram' | 'youtube' | 'google' | 'tiktok';
  campaignId?: string;
  adId?: string;
  status: LeadStatus;
  estimatedValueNGN?: number;
  notes?: string;
  lastContactedAt?: string;
  conversationId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSceneConcept {
  sceneNumber: number;
  durationSeconds: number;
  visualDescription: string;
  voiceoverScript: string;
  onScreenText: string;
  cameraMovement: string;
}

export interface AIVideoConceptResponse {
  conceptTitle: string;
  hook: string;
  scenes: VideoSceneConcept[];
  totalDurationSeconds: number;
  callToAction: string;
  recommendedMusicMood: string;
  suggestedHashtags: string[];
}

export interface AIImageAdFormat {
  format: 'square_1x1' | 'story_9x16' | 'landscape_16x9' | 'banner_4x3';
  label: string;
  dimensions: string;
  headline: string;
  badgeText: string;
  overlayStyle: string;
  recommendedCta: string;
}

export interface ImageAdConcept {
  id?: string;
  format: 'square_1x1' | 'story_9x16' | 'landscape_16x9' | 'banner_4x3';
  label: string;
  dimensions: string;
  headline: string;
  badgeText: string;
  overlayStyle: string;
  recommendedCta: string;
  prompt?: string;
  sampleImageUrl?: string;
}

export interface AdBoostPlan {
  type: 'featured' | 'homepage' | 'category_top' | 'sponsored';
  durationDays: number;
  budgetNGN: number;
  expiresAt: string;
  targetRadiusKm?: number;
}

export interface Advertisement {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  businessCategory: BusinessCategoryType;
  title: string;
  description: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video';
  category: string;
  subcategory?: string;
  price?: number;
  currency?: string;
  location: LocationCoordinates;
  tags: string[];
  targetRadiusKm?: number;
  status: AdStatus;
  isBoosted?: boolean;
  boostPlan?: AdBoostPlan;
  expiresAt: string;
  viewsCount: number;
  clicksCount: number;
  enquiriesCount: number;
  contactPhone?: string;
  contactWhatsApp?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  description: string;
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachments?: {
    url: string;
    name: string;
    type: 'image' | 'video' | 'document';
    size?: number;
  }[];
  productRef?: Product;
  serviceRef?: Service;
  adRef?: Advertisement;
  invoiceRef?: Invoice;
  paymentLink?: {
    url: string;
    amount: number;
    currency: string;
    description: string;
  };
  deliveryStatus: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    businessName?: string;
    online?: boolean;
  }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'enquiry' | 'invoice' | 'payment' | 'ad_status' | 'subscription' | 'review' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export type NotificationItem = {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'payment_received' | 'invoice_issued' | 'new_inquiry' | 'boost_activated' | 'verification_approved' | 'system' | 'message' | 'enquiry' | 'invoice' | 'payment' | 'ad_status' | 'subscription' | 'review';
  read: boolean;
  actionUrl?: string;
  link?: string;
  createdAt: string;
};

export interface Review {
  id: string;
  businessId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: 'ad' | 'business' | 'user' | 'message';
  targetId: string;
  targetTitle: string;
  targetName?: string;
  details?: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export type ReportItem = Report;

export interface CategoryConfig {
  id: BusinessCategoryType;
  name: string;
  slug: string;
  iconName: string;
  description: string;
  subcategories: string[];
  bannerImage: string;
}

export interface SubscriptionPlan {
  id: string;
  name?: string;
  tier?: SubscriptionTier;
  displayName?: string;
  badge?: string;
  monthlyPriceNGN?: number;
  annualPriceNGN?: number;
  priceNGN?: number;
  priceUSD?: number;
  priceMonth?: number;
  priceYear?: number;
  billingCycle?: 'monthly' | 'yearly';
  features: string[];
  adLimit?: number;
  limits?: {
    maxActiveAds: number;
    maxPortfolioItems: number;
    maxProducts: number;
    aiGenerationsPerMonth: number;
    prioritySearchRanking: boolean;
    verifiedGoldBadge: boolean;
    customDomain: boolean;
    analyticsTier: 'basic' | 'advanced' | 'enterprise';
  };
  recommended?: boolean;
  highlighted?: boolean;
  popular?: boolean;
}

export interface AIMarketingRequest {
  businessName: string;
  productOrService: string;
  businessCategory: string;
  targetAudience: string;
  location: string;
  tone: 'catchy_promotional' | 'professional_luxury' | 'local_authentic' | 'urgency_discount';
  customInstructions?: string;
}

export interface AIMarketingResponse {
  headlines: string[];
  description: string;
  socialCaptions: {
    platform: 'Instagram' | 'WhatsApp' | 'Facebook' | 'Twitter/X' | 'TikTok';
    text: string;
    hashtags: string[];
  }[];
  callToAction: string;
  suggestedHashtags: string[];
  imagePrompt: string;
  estimatedReachMultiplier: string;
}

export interface FXRate {
  pair: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  inverseRate: number;
  source: string;
  timestamp: string;
  providerSpreadPercent: number;
  effectiveRate: number;
}

export interface CurrencyConfig {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  flag: string;
  minAmount: number;
  maxAmount: number;
  supportedMethods: ('card' | 'bank_transfer' | 'apple_pay' | 'google_pay' | 'ussd' | 'qr')[];
  enabled: boolean;
  settlementSupported: boolean;
}

export interface PaymentQuote {
  quoteId: string;
  baseAmount: number;
  baseCurrency: 'NGN';
  customerAmount: number;
  customerCurrency: SupportedCurrency;
  exchangeRate: number;
  exchangeRateTimestamp: string;
  rateSource: string;
  platformFeePercent: number;
  platformFeeAmount: number;
  providerProcessingFee: number;
  totalCustomerPayable: number;
  netSettlementNGN: number;
  expiresAt: string;
  isExpired: boolean;
  signature: string;
}

export type LedgerAccountType = 'ASSET_SETTLEMENT_RECEIVABLE' | 'LIABILITY_MERCHANT_PAYABLE' | 'REVENUE_PLATFORM_FEES' | 'REVENUE_FX_SPREAD' | 'EXPENSE_GATEWAY_FEES' | 'LIABILITY_ESCROW' | string;

export interface Payment {
  id: string;
  quoteId?: string;
  invoiceId?: string;
  transactionRef?: string;
  reference?: string;
  merchantId?: string;
  merchantName?: string;
  businessId?: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerCountry?: string;
  amount?: number;
  baseAmount?: number;
  baseCurrency?: string;
  customerAmount?: number;
  currency?: string;
  customerCurrency?: string;
  baseAmountNGN?: number;
  exchangeRate?: number;
  exchangeRateTimestamp?: string;
  rateSource?: string;
  platformFee?: number;
  fees?: number | {
    platformFee: number;
    processingFee: number;
    totalFeesCustomerCurrency: number;
    totalFeesNGNEquivalent: number;
    vatNGN: number;
  };
  netAmountNGN?: number;
  netSettlementNGN?: number;
  paymentMethod: string;
  provider?: 'flutterwave' | 'paystack';
  paymentProvider?: 'flutterwave' | 'paystack';
  providerTransactionId?: string;
  providerReference?: string;
  settlementStatus?: 'pending' | 'settled' | 'processing' | 'failed';
  settlementId?: string;
  status: 'successful' | 'pending' | 'failed' | 'refunded' | 'disputed' | 'processing' | 'expired' | 'partially_refunded';
  description: string;
  threeDSecureRequired?: boolean;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalBusinesses: number;
  activeAds: number;
  totalVolumeNGN: number;
  totalInvoicesPaid: number;
  mrrNGN: number;
  boostedAdsCount: number;
  verifiedBusinessesCount: number;
}

// Backward-compat aliases for existing modules
export type ServiceAd = Advertisement;
export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'expired' | 'refunded' | 'partially_refunded' | 'disputed';
export type PaymentMethodType = 'card' | 'bank_transfer' | 'apple_pay' | 'google_pay' | 'ussd' | 'qr';
export type ProviderType = 'flutterwave' | 'paystack';

export interface Merchant {
  id: string;
  businessName: string;
  email: string;
  country: 'Nigeria';
  settlementCurrency: 'NGN';
  settlementBank: string;
  settlementBankCode: string;
  settlementAccountNumber: string;
  settlementAccountName: string;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  kycTier: 'tier_1' | 'tier_2' | 'corporate_tier_3';
  dailyLimitNGN: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  country: string;
  phone?: string;
  createdAt: string;
}

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  paymentReference?: string;
  providerReference?: string;
  paymentMethod?: PaymentMethodType | string;
  provider: ProviderType;
  method?: PaymentMethodType;
  status: 'initiated' | 'challenge_required' | 'authorized' | 'declined' | 'failed' | 'successful' | 'processing';
  providerRef?: string;
  responseCode?: string;
  responseMessage?: string;
  ipAddress?: string;
  riskScore?: number;
  errorMessage?: string;
  latencyMs?: number;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: ProviderType;
  eventType: string;
  eventId?: string;
  signature?: string;
  signatureValid?: boolean;
  payload: Record<string, unknown>;
  verified?: boolean;
  processed: boolean;
  processedAt?: string;
  idempotencyKey?: string;
  errorMessage?: string;
  receivedAt?: string;
  createdAt?: string;
}

export interface LedgerEntry {
  id: string;
  paymentId?: string;
  transactionReference?: string;
  journalEntryId?: string;
  accountName?: string;
  reconciled?: boolean;
  timestamp: string;
  account: string;
  debit: number;
  credit: number;
  currency: 'NGN';
  description: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  merchantName?: string;
  amountNGN?: number;
  grossAmountNGN?: number;
  feeNGN?: number;
  feeDeductionsNGN?: number;
  netNGN?: number;
  netSettlementNGN?: number;
  transactionCount?: number;
  bankName?: string;
  destinationBank?: string;
  destinationBankCode?: string;
  accountNumber?: string;
  destinationAccount?: string;
  destinationAccountName?: string;
  accountName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'settled';
  batchId?: string;
  transferRef?: string;
  payoutReference?: string;
  nibssSessionId?: string;
  initiatedAt?: string;
  completedAt?: string;
  settledAt?: string;
  createdAt?: string;
}

export interface ReconciliationRecord {
  id: string;
  paymentId?: string;
  internalPaymentId?: string;
  internalReference?: string;
  providerReference?: string;
  internalAmountNGN?: number;
  providerAmountNGN?: number;
  providerAmount?: number;
  providerCurrency?: string;
  settlementAmountNGN?: number;
  ledgerBalanced?: boolean;
  discrepancyType?: string;
  reconciliationDate?: string;
  resolvedBy?: string;
  notes?: string;
  status: 'matched' | 'discrepancy' | 'investigating' | 'flagged' | 'resolved';
  checkedAt?: string;
  createdAt?: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  merchantId?: string;
  paymentReference?: string;
  providerRefundId?: string;
  requestedBy?: string;
  refundAmount?: number;
  refundAmountCustomerCurrency?: number;
  originalAmountCustomerCurrency?: number;
  originalCustomerCurrency?: string;
  fxRateApplied?: number;
  refundCurrency: string;
  refundAmountNGN?: number;
  settlementNGNImpact?: number;
  reason: string;
  status: 'initiated' | 'completed' | 'failed';
  processedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  eventType: string;
  category?: string;
  action?: string;
  actorId: string;
  actorType: 'customer' | 'merchant' | 'admin' | 'system' | 'super_admin' | 'webhook';
  targetId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface PlatformConfig {
  primaryProvider: ProviderType;
  secondaryProvider: ProviderType;
  providerFailoverEnabled: boolean;
  platformFeePercent: number;
  fxSpreadPercent: number;
  quoteExpirationSeconds: number;
  autoSettlementEnabled: boolean;
  settlementSchedule: 'instant' | 'daily_eod' | 't_plus_1';
  fraudRiskThreshold: number;
  webhookSecret: string;
}

export interface NigerianBank {
  name: string;
  code: string;
  ussdPrefix: string;
}

export interface TestSuiteResult {
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  scenarios: TestScenarioItem[];
}

export type TestScenarioResult = TestScenarioItem;

export interface TestScenarioItem {
  id?: string;
  name?: string;
  category: string;
  description: string;
  status: 'passed' | 'failed' | 'pending';
  durationMs?: number;
  logs?: string[];
  error?: string;
  scenarioId?: string;
  title?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  auditTrail?: string[];
  errorMessage?: string;
  executionTimeMs?: number;
}
