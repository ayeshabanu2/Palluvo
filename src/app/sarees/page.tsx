import React, { Suspense } from 'react';
import { Metadata } from 'next';
import SareesClient from './SareesClient';

export const metadata: Metadata = {
  title: 'All Sarees | Curated Luxury Handloom Collection',
  description: 'Explore PALLUVO’s curated luxury handloom sarees, including Kanjivaram, Banarasi, Chanderi, Paithani, and Organza drapes.',
  alternates: {
    canonical: '/sarees',
  },
  openGraph: {
    title: 'All Sarees | Curated Luxury Handloom Collection | PALLUVO',
    description: 'Explore PALLUVO’s curated luxury handloom sarees, including Kanjivaram, Banarasi, Chanderi, Paithani, and Organza drapes.',
    url: 'https://palluvo.com/sarees',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Curated Luxury Sarees Collection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Sarees | Curated Luxury Handloom Collection | PALLUVO',
    description: 'Explore PALLUVO’s curated luxury handloom sarees, including Kanjivaram, Banarasi, Chanderi, Paithani, and Organza drapes.',
    images: ['/images/hero_campaign.jpg'],
  },
};

export default function SareesPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="text-center py-20 font-serif">Loading signature collection...</div>}>
      <SareesClient />
    </Suspense>
  );
}
