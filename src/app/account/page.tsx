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

export default function AccountPage(): React.JSX.Element {
  return <AccountClient />;
}
