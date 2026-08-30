# Boost Market 🚀
> Full-Stack Business Advertising, Local Discovery, Invoicing & Multi-Currency Settlement Engine

Boost Market is a modern marketplace and business promotion SaaS designed for small to enterprise-scale businesses across Nigeria and global markets. It combines hyperlocal service discovery, advertising boost campaigns, real-time customer messaging, portfolio showcases, digital invoicing, AI-powered marketing copy generation, and an institutional-grade multi-currency payment ledger with automated settlement reconciliation.

---

## ✨ Key Features

### 🏢 1. Business Profiles & Hyperlocal Marketplace
- **Category-Driven Discovery**: Browse and filter businesses across Services, Retail, Food & Hospitality, Creative, Tech & Software, Agriculture, Automotive, Beauty & Wellness, Real Estate, and Education.
- **Geolocation & Radius Filtering**: Real-time GPS distance calculation and service radius targeting.
- **Verified Merchant Badges**: KYC verification tiering (Tier 1, Tier 2, Corporate Tier 3).
- **Interactive Showcases**: Product catalogs, service booking menus, portfolio galleries, operating hours, and customer reviews.

### 📢 2. Ad Creation & Boost Engine
- **Multi-Tier Ad Campaigns**: Launch Featured Ads, Homepage Banners, Top-of-Category placements, and Geo-Targeted Sponsored listings.
- **Budget & Duration Control**: Set dynamic budgets, view estimated impression reaches, and track click-through rates.
- **Rich Media**: Upload high-resolution images, banners, and promotional assets.

### 🤖 3. AI Marketing Generator (Gemini 2.5)
- **Instant Ad Copy**: Generate engaging multi-platform marketing headlines, descriptions, social media captions (Instagram, WhatsApp, TikTok, X), and recommended hashtags.
- **Multi-Tone Selection**: Choose from Catchy Promotional, Professional Luxury, Local Authentic, or Urgency Discount styles.

### 💬 4. In-App Messaging & Digital Invoicing
- **Real-Time Customer Inquiries**: Chat directly with business owners.
- **Direct Digital Invoices**: Generate itemized invoices with automated tax, discounts, due dates, and instant payment links.
- **In-Chat Payment Links**: Complete transactions directly from conversation threads.

### 💳 5. Multi-Currency Payment & Double-Entry Ledger Engine
- **Supported Currencies**: `NGN`, `USD`, `GBP`, `EUR`, `AED`, `CAD`, `ZAR`, `KES`, `GHS`.
- **Payment Methods**: Credit/Debit Cards, Bank Transfer, Apple Pay, Google Pay, USSD, and QR.
- **Gateway Orchestration**: Smart routing and failover across **Flutterwave** and **Paystack**.
- **Double-Entry General Ledger**: Real-time balancing across Gateway Receivables, Merchant Payables, Fee Revenues, FX Spreads, and Escrow Accounts.
- **Automated Settlement & Reconciliation**: NIBSS payout tracking, refund reversibility, and discrepancy detection.

### 👑 6. CEO & Admin Governance Dashboard
- **Platform Analytics**: Track GMV, MRR, Active Ads, Total Businesses, and User Conversion rates.
- **Merchant Verification**: Approve or review business KYC applications.
- **Content Moderation**: Review reported ads and user complaints with actionable audit logs.
- **System Diagnostics**: Built-in test runner validating quotes, payments, ledgers, failovers, and webhooks.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (animations), Lucide React (icons), Canvas Confetti
- **Backend / Server**: Node.js, Express, TSX, esbuild
- **AI Intelligence**: `@google/genai` (Google Gemini 2.5 Flash)
- **Payment & FX**: Paystack & Flutterwave integrations, Dynamic FX Engine, Double-entry Ledger
- **Build Tool**: Vite 6, TypeScript 5.8

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (version 18+ or 20+ recommended)
- **npm**, **pnpm**, or **yarn**

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Maddyahamco00/boost-market.git
cd boost-market
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your API keys in `.env`:
```env
# Gemini API Key for AI copy generation
GEMINI_API_KEY=your_gemini_api_key_here

# Payment Gateway Keys (Optional for live payments, mock fallbacks included)
FLUTTERWAVE_SECRET_KEY=your_flw_secret_key
FLUTTERWAVE_PUBLIC_KEY=your_flw_public_key

PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Webhook signature secret
WEBHOOK_SECRET=your_webhook_secret_key
```

### 4. Running Locally
Start the unified full-stack development server:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the full-stack Express + Vite development server on port 3000 |
| `npm run build` | Builds the client static assets and bundles the backend server via `esbuild` |
| `npm run start` | Runs the production-compiled server bundle (`dist/server.cjs`) |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run clean` | Cleans up build artifacts |

---

## 📁 Project Structure

```
boost-market/
├── src/
│   ├── components/              # React UI components
│   │   ├── Navbar.tsx           # Navigation and role switcher
│   │   ├── BusinessDirectory.tsx# Marketplace search, category & map discovery
│   │   ├── BusinessProfileView.tsx # Merchant profile, catalog & reviews
│   │   ├── CreateAdModal.tsx    # Ad campaign creation with radius targeting
│   │   ├── InvoicingModal.tsx   # Digital invoice builder & manager
│   │   ├── ChatDrawer.tsx       # In-app messaging & inquiry manager
│   │   ├── AIMarketingModal.tsx # Gemini AI promotional copy generator
│   │   ├── AdminPanelView.tsx   # CEO & platform governance control panel
│   │   ├── CheckoutModal.tsx    # Multi-currency payment checkout UI
│   │   ├── PricingPlansView.tsx # Subscription tier upgrade modal
│   │   └── ...
│   ├── server/                  # Server-side domain services & ledger
│   │   ├── db.ts                # In-memory persistence store & initial seed
│   │   └── services/            # Payment, FX, settlement, ledger & test runners
│   │       ├── paymentService.ts
│   │       ├── fxRateService.ts
│   │       ├── ledgerService.ts
│   │       ├── settlementService.ts
│   │       ├── reconciliationService.ts
│   │       └── providers/       # Flutterwave & Paystack gateway providers
│   ├── types.ts                 # Shared TypeScript domain models & interfaces
│   ├── App.tsx                  # Main application state & view routing
│   └── main.tsx                 # React entry point
├── server.ts                    # Express server entry point & API endpoints
├── index.html                   # HTML template
├── package.json                 # Project dependencies and build scripts
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript compiler configuration
```

---

## 🔒 Security & Best Practices
- **Server-Side API Proxying**: All sensitive operations (Gemini AI queries, payment gateway API requests, and webhook signature verifications) run strictly on the Node.js server.
- **Double-Entry Invariance**: Every financial movement (inflow, platform fee split, merchant settlement payable, and refund reversal) maintains an exact trial balance where `Debit == Credit`.
- **Zero Exposed Browser Secrets**: Client-side code never accesses private gateway secret keys.

---

## 📄 License
This project is licensed under the MIT License.
