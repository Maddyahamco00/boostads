# Boost Market — VS Code Setup & Developer Guide 🛠️

This guide covers everything you need to know to open, configure, and customize **Boost Market** in **Visual Studio Code**.

---

## 📋 1. Opening the Project in VS Code

1. Open **VS Code**.
2. Click **File** > **Open Folder...** (or press `Ctrl+K Ctrl+O` on Windows/Linux, `Cmd+O` on macOS).
3. Select the `boost-market` folder.
4. Open the integrated terminal in VS Code using the shortcut:
   - **Windows/Linux**: `` Ctrl + ` ``
   - **macOS**: `` Cmd + ` ``

---

## 🔑 2. Setting Up Your Environment Variables (`.env`)

Inside the root directory, create a new file named `.env` (or duplicate `.env.example` and rename it to `.env`).

### `.env` File Template:
```env
# ==========================================
# 1. Google Gemini AI (Required for AI Copy Generator)
# ==========================================
# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# ==========================================
# 2. Application Host URL
# ==========================================
APP_URL=http://localhost:3000

# ==========================================
# 3. Flutterwave Payment Gateway (Optional - Demo fallback active)
# ==========================================
# Get your keys at: https://dashboard.flutterwave.com
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxx-X
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxx-X

# ==========================================
# 4. Paystack Payment Gateway (Optional - Demo fallback active)
# ==========================================
# Get your keys at: https://dashboard.paystack.com
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ==========================================
# 5. Webhook Signature Secret
# ==========================================
WEBHOOK_SECRET=your_custom_webhook_secret_hash

# ==========================================
# 6. Database URL (Optional)
# ==========================================
DATABASE_URL=
```

> **Note:** Even without live Flutterwave/Paystack API keys, the built-in mock fallback engine allows all payment, quote generation, and checkout flows to simulate real responses in development mode.

---

## 🔌 3. Recommended VS Code Extensions

For the best developer experience, install these extensions from the VS Code Marketplace (`Ctrl+Shift+X` or `Cmd+Shift+X`):

1. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Autocompletion and hover preview for Tailwind classes.
2. **ESLint** (`dbaeumer.vscode-eslint`) — Real-time syntax and linting checks.
3. **Prettier - Code formatter** (`esbenp.prettier-vscode`) — Automated code styling on save.
4. **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`) — Makes TypeScript compiler messages easily readable.
5. **Thunder Client** or **Postman** — For testing `/api/*` endpoints directly inside VS Code.

---

## 🏃 4. Running the Development Server

In your VS Code terminal, run:

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start the unified development server
npm run dev
```

The application will launch on **`http://localhost:3000`**.

### Other Useful Commands:
```bash
# Check TypeScript types for errors
npm run lint

# Build production bundle (client + server.cjs)
npm run build

# Start production server
npm run start
```

---

## 📁 5. Key Files You Might Want to Edit in VS Code

| File Path | Description |
| :--- | :--- |
| `src/types.ts` | All shared TypeScript data models (Businesses, Ads, Payments, Invoices, Ledgers) |
| `src/App.tsx` | Main frontend layout, active view tabs, modal triggers, and global state |
| `src/components/BusinessDirectory.tsx` | Marketplace grid, category filters, distance sliders, and map views |
| `src/components/BusinessProfileView.tsx` | Business public profile page, product catalog, service list, and reviews |
| `src/components/CreateAdModal.tsx` | Ad campaign creation modal with boost tiers and radius selector |
| `src/components/InvoicingModal.tsx` | Digital invoice generator with PDF styling and payment links |
| `src/components/AIMarketingModal.tsx` | AI prompt dialog generating multi-platform marketing copy |
| `src/components/AdminPanelView.tsx` | CEO dashboard, merchant KYC verification, and audit logs |
| `src/components/CheckoutModal.tsx` | Customer multi-currency payment checkout interface |
| `server.ts` | Backend Express server, routing, API proxies, and Vite middleware |
| `src/server/services/` | Domain logic for payments, FX rates, settlements, and ledger accounting |

---

## 🐙 6. Git & GitHub Push / Pull Guide

If you need to push or pull changes from your VS Code terminal to GitHub:

### Check Status & Commit Changes:
```bash
# 1. Stage all changes
git add .

# 2. Commit with a message
git commit -m "Update Boost Market features and documentation"

# 3. Push to main branch
git push -u origin main
```

### If GitHub asks for authentication:
1. Create a **Personal Access Token (Classic)** on GitHub:
   - Go to **GitHub Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
   - Generate new token with `repo` scope.
2. Use your GitHub username and the generated Token as your password when prompted in the terminal.

---

## ❓ 7. Troubleshooting in VS Code

- **Port 3000 already in use:**
  - Check running processes or kill the existing process:
    - On macOS/Linux: `npx kill-port 3000`
    - On Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
- **TypeScript errors not updating:**
  - Press `Ctrl+Shift+P` (or `Cmd+Shift+P`), type `TypeScript: Restart TS Server`, and press Enter.
- **Tailwind styles not showing up:**
  - Make sure the server was started with `npm run dev` and `@import "tailwindcss";` is present in `src/index.css`.
