import './globals.css';
import React from 'react';
import { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/context/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import QuickViewModal from '@/components/QuickViewModal';
import Toast from '@/components/Toast';

export const viewport: Viewport = {
  themeColor: '#641C2D',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://palluvo.com'),
  title: {
    default: 'PALLUVO — Every drape, a little magic | Contemporary Indian Luxury Sarees',
    template: '%s | PALLUVO Luxury Sarees',
  },
  description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear. 100% Silk Mark certified.',
  keywords: 'sarees, banarasi silk saree, kanjivaram silk, organza saree, paithani saree, bridal saree, luxury handloom',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://palluvo.com',
    siteName: 'PALLUVO',
    title: 'PALLUVO — Every drape, a little magic | Contemporary Indian Luxury Sarees',
    description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear. 100% Silk Mark certified.',
    images: [
      {
        url: '/images/hero_campaign.jpg',
        width: 1200,
        height: 630,
        alt: 'PALLUVO Luxury Handloom Sarees',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PALLUVO — Every drape, a little magic | Contemporary Indian Luxury Sarees',
    description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear.',
    images: ['/images/hero_campaign.jpg'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PALLUVO',
  url: 'https://palluvo.com',
  logo: 'https://palluvo.com/icon.svg',
  description: 'Contemporary Luxury Indian Saree Fashion House & Boutique Atelier.',
  sameAs: [
    'https://instagram.com/palluvo',
    'https://facebook.com/palluvo',
    'https://pinterest.com/palluvo',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-98765-43210',
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: ['en', 'hi'],
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PALLUVO',
  url: 'https://palluvo.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://palluvo.com/sarees?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-[#F8F5EF] text-[#241F1D]">
        <StoreProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <CartDrawer />
          <QuickViewModal />
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
