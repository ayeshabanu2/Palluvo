import React, { Suspense } from 'react';
import { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In | PALLUVO Luxury Sarees',
  description: 'Sign in to your PALLUVO Atelier account to track orders and manage your handloom saree collection.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/login',
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="w-full max-w-md h-96 bg-white/50 animate-pulse rounded-2xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
