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
import { PlacedOrder } from '@/types';

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <AccountPortal />;
  }

  // Attempt to fetch server-side orders scoped to this authenticated user via RLS
  let initialOrders: PlacedOrder[] | null = null;
  try {
    const { data: serverOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && serverOrders) {
      initialOrders = serverOrders.map((o: Record<string, unknown>) => ({
        id: (o.id as string) || (o.order_number as string) || (o.orderNumber as string),
        orderNumber: (o.order_number as string) || (o.orderNumber as string) || (o.id as string),
        date: (o.date as string) || (o.created_at ? new Date(o.created_at as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })),
        status: (o.status as 'Confirmed' | 'Delivered' | 'In Transit') || 'Confirmed',
        items: (o.items as PlacedOrder['items']) || [],
        subtotal: Number(o.subtotal) || 0,
        discountAmount: Number(o.discount_amount ?? o.discountAmount ?? 0),
        shippingFee: Number(o.shipping_fee ?? o.shippingFee ?? 0),
        grandTotal: Number(o.grand_total ?? o.grandTotal ?? 0),
        paymentMethod: (o.payment_method as PlacedOrder['paymentMethod']) || (o.paymentMethod as PlacedOrder['paymentMethod']) || 'card',
        customer: (o.customer as PlacedOrder['customer']) || {}
      }));
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
