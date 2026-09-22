'use client';

import React from 'react';
import { Logo } from './Logo';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Sparkles, MapPin, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <footer 
      id="boost-market-footer" 
      className="w-full border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 transition-colors"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <button 
              onClick={() => setActiveView('landing')} 
              className="text-left cursor-pointer focus:outline-none"
            >
              <Logo variant="horizontal" size="sm" showTagline={true} />
            </button>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              Boost Market is an AI-powered business advertising platform connecting merchants, products, services, and customers across Nigeria.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#16C784]" />
              <span>Verified Merchant Guarantee • Direct WhatsApp Inbound Leads</span>
            </div>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveView('landing')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('discover')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Explore Directory & Ads
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('campaigns')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Boost Campaigns
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('merchant_dashboard')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Merchant Business Hub
                </button>
              </li>
            </ul>
          </div>

          {/* Account & Security */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Account & Trust
            </h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveView('register')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Register Business
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('login')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('admin_login')} 
                  className="hover:text-[#16C784] transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  Super Admin Portal
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line matching prototype */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>
            Smart advertising. Better results. Powered by AI. © 2024–{new Date().getFullYear()} Boost Market. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Kaduna • Lagos • Abuja • Nationwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
