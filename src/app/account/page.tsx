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

  // Attempt to fetch server-side orders scoped to this authenticated user via RLS
  let initialOrders = null;
  try {
    const { data: serverOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && serverOrders) {
      initialOrders = serverOrders;
    }
  } catch {
    // If Supabase table is not provisioned, AccountClient will partition client storage by userId
  }

  return (
    <AccountClient 
      userEmail={user.email} 
      userId={user.id} 
      userName={user.user_metadata?.full_name} 
      serverOrders={initialOrders}
    />
  );
}
