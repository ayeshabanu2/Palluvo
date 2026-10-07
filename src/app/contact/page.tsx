import React from 'react';
import { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Atelier',
  description: 'Reach our saree concierge and client care atelier for styling assistance, bespoke orders, and appointments.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Atelier | PALLUVO Luxury Sarees',
    description: 'Reach our saree concierge and client care atelier for styling assistance, bespoke orders, and appointments.',
    url: 'https://palluvo.com/contact',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Luxury Sarees Concierge & Client Care',
      },
    ],
  },
};

export default function ContactPage(): React.JSX.Element {
  return <ContactClient />;
}
