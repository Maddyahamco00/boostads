import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer id="boost-market-footer" className="w-full bg-white border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8 text-sm text-gray-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <div className="w-6 h-6 rounded bg-[#16C784] flex items-center justify-center text-white text-xs font-bold">
            B
          </div>
          <span>Boost Market</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-600">
          <Link 
            href="/" 
            className="hover:text-[#16C784] transition-colors cursor-pointer"
          >
            Explore
          </Link>
          <Link 
            href="/register" 
            className="hover:text-[#16C784] transition-colors cursor-pointer"
          >
            Sign Up
          </Link>
          <Link 
            href="/login" 
            className="hover:text-[#16C784] transition-colors cursor-pointer"
          >
            Login
          </Link>
          <Link 
            href="/admin/login" 
            className="hover:text-[#16C784] transition-colors cursor-pointer text-xs text-gray-400"
          >
            Admin
          </Link>
        </div>

        <div className="text-xs text-gray-400">
          © {new Date().getFullYear()} Boost Market (Real Boosters). All rights reserved.
        </div>
      </div>
    </footer>
  );
};
