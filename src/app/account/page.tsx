import React from 'react';
import { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'My Atelier Account',
  description: 'Manage your PALLUVO privilege account, tracked handloom saree orders, and delivery addresses.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/account',
  },
  openGraph: {
    title: 'My Atelier Account | PALLUVO Luxury Sarees',
    description: 'Manage your PALLUVO privilege account, tracked handloom saree orders, and delivery addresses.',
    url: 'https://palluvo.com/account',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Atelier Account',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Atelier Account | PALLUVO Luxury Sarees',
    description: 'Manage your PALLUVO privilege account, tracked handloom saree orders, and delivery addresses.',
    images: ['/images/hero_campaign.jpg'],
  },
};

import { createClient } from '@/utils/supabase/server';
import AccountPortal from './AccountPortal';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AccountPortal />;
  }

  // Pass user details down to AccountClient (will need to update AccountClient props)
  return <AccountClient 
    userEmail={user.email} 
    userId={user.id} 
    userName={user.user_metadata?.full_name} 
  />;
}
