import React from 'react';
import { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Atelier | PALLUVO Luxury Sarees',
  description: 'Reach our saree concierge and client care atelier for styling assistance, bespoke orders, and appointments.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact Atelier | PALLUVO Luxury Sarees',
    description: 'Reach our saree concierge and client care atelier for styling assistance, bespoke orders, and appointments.',
    url: 'https://palluvo.com/contact',
  },
};

export default function ContactPage(): React.JSX.Element {
  return <ContactClient />;
}
