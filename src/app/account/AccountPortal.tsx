import React from 'react';
import Link from 'next/link';
import { User, LogIn, UserPlus } from 'lucide-react';

export default function AccountPortal() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 min-h-[60vh] flex flex-col justify-center">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#F8F5EF] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#EDE3D5]">
          <User className="w-8 h-8 text-[#B08D57]" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#2B211D] mb-2">Welcome to PALLUVO</h1>
        <p className="text-sm text-[#6D625D]">
          Please sign in or create an account to view your orders, manage your wishlist, and place orders seamlessly.
        </p>
      </div>

      <div className="space-y-4">
        <Link 
          href="/login"
          className="flex items-center justify-center gap-2 w-full bg-[#641C2D] text-white py-3.5 rounded-xl font-bold tracking-wider uppercase hover:bg-[#4E1422] transition shadow-md"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </Link>
        
        <Link 
          href="/register"
          className="flex items-center justify-center gap-2 w-full bg-white text-[#641C2D] border border-[#641C2D] py-3.5 rounded-xl font-bold tracking-wider uppercase hover:bg-[#F8F5EF] transition"
        >
          <UserPlus className="w-4 h-4" /> Create Account
        </Link>
      </div>

    </div>
  );
}
