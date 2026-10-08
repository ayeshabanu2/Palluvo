import React from 'react';
import { Metadata } from 'next';
import CartClient from './CartClient';

export const metadata: Metadata = {
  title: 'Shopping Bag',
  description: 'Review your selected luxury handloom sarees, bespoke blouse tailoring, and order summary at PALLUVO.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/cart',
  },
  openGraph: {
    title: 'Shopping Bag | PALLUVO Luxury Sarees',
    description: 'Review your selected luxury handloom sarees, bespoke blouse tailoring, and order summary at PALLUVO.',
    url: 'https://palluvo.com/cart',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Shopping Bag',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shopping Bag | PALLUVO Luxury Sarees',
    description: 'Review your selected luxury handloom sarees, bespoke blouse tailoring, and order summary at PALLUVO.',
    images: ['/images/hero_campaign.jpg'],
  },
};

export default function CartPage(): React.JSX.Element {
  return <CartClient />;
}
