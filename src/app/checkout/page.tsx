import React from 'react';
import { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Secure Checkout',
  description: 'Complete your luxury saree purchase with complimentary insured delivery and verified checkout at PALLUVO.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/checkout',
  },
  openGraph: {
    title: 'Secure Checkout | PALLUVO Luxury Sarees',
    description: 'Complete your luxury saree purchase with complimentary insured delivery and verified checkout at PALLUVO.',
    url: 'https://palluvo.com/checkout',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Secure Checkout',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Secure Checkout | PALLUVO Luxury Sarees',
    description: 'Complete your luxury saree purchase with complimentary insured delivery and verified checkout at PALLUVO.',
    images: ['/images/hero_campaign.jpg'],
  },
};

export default function CheckoutPage(): React.JSX.Element {
  return <CheckoutClient />;
}
