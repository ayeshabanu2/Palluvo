'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, User, ShoppingBag } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { totalCartCount, setIsCartOpen } = useStore();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EDE3D5] pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-[60px] px-2">
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/' ? 'text-[#641C2D]' : 'text-[#665E57] hover:text-[#641C2D]'}`}
        >
          <Home className="w-[22px] h-[22px]" />
          <span className="text-[10px] font-medium tracking-wide">Home</span>
        </Link>
        
        <Link 
          href="/sarees" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/sarees' ? 'text-[#641C2D]' : 'text-[#665E57] hover:text-[#641C2D]'}`}
        >
          <LayoutGrid className="w-[22px] h-[22px]" />
          <span className="text-[10px] font-medium tracking-wide">Categories</span>
        </Link>
        
        <Link 
          href="/account" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${pathname === '/account' ? 'text-[#641C2D]' : 'text-[#665E57] hover:text-[#641C2D]'}`}
        >
          <User className="w-[22px] h-[22px]" />
          <span className="text-[10px] font-medium tracking-wide">Account</span>
        </Link>
        
        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-[#665E57] hover:text-[#641C2D] transition-colors"
        >
          <div className="relative">
            <ShoppingBag className="w-[22px] h-[22px]" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-[18px] h-[18px] bg-[#641C2D] text-[#D6B878] text-[9.5px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {totalCartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide">Cart</span>
        </button>
      </div>
    </nav>
  );
}
