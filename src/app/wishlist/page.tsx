import React from 'react';
import { Metadata } from 'next';
import WishlistClient from './WishlistClient';

export const metadata: Metadata = {
  title: 'Your Saved Sarees | PALLUVO Wishlist',
  description: 'Your saved luxury handloom sarees collection at PALLUVO.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/wishlist',
  },
};

export default function WishlistPage(): React.JSX.Element {
  return <WishlistClient />;
}
