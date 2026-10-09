import React, { Suspense } from 'react';
import { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create an Account | PALLUVO Luxury Sarees',
  description: 'Join PALLUVO to experience curated authentic Indian handloom sarees and member benefits.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/register',
  },
};

export default function RegisterPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="w-full max-w-md h-96 bg-white/50 animate-pulse rounded-2xl" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
