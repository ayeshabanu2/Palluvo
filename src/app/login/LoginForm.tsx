'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';
import { login } from './actions';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/account';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set('redirect', redirectUrl);

    try {
      const res = await login(formData);
      if (res && res.error) {
        setErrorMessage(res.error);
        setIsLoading(false);
      }
    } catch {
      // In Next.js server actions, redirect throws an internal error caught by Next.js router
    }
  }

  return (
    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#EDE3D5]">
      <div className="text-center mb-8">
        <span className="text-xs uppercase tracking-[0.25em] text-[#641C2D] font-semibold block mb-2">
          Atelier Access
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#2B211D]">Sign In</h1>
        <p className="text-sm text-[#6D625D] mt-2">
          Welcome back to PALLUVO. Enter your details to access your account.
        </p>
      </div>

      {errorMessage && (
        <div 
          role="alert" 
          aria-live="polite" 
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-[#2B211D] mb-1.5">
            Email Address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            className="w-full px-4 py-3 rounded-xl border border-[#EDE3D5] text-[#2B211D] placeholder-[#A09891] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] transition text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-[#2B211D]">
              Password
            </label>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-[#EDE3D5] text-[#2B211D] placeholder-[#A09891] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] transition text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#641C2D] text-white py-3.5 rounded-xl font-bold tracking-wider uppercase text-sm hover:bg-[#4E1422] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed mt-2 min-h-[44px]"
        >
          <LogIn className="w-4 h-4" />
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#EDE3D5] text-center text-sm text-[#6D625D]">
        Don&apos;t have an account?{' '}
        <Link href={`/register${redirectUrl !== '/account' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="font-semibold text-[#641C2D] hover:underline">
          Create an Account
        </Link>
      </div>
    </div>
  );
}
