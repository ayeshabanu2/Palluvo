import './globals.css';
import React from 'react';
import { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Cormorant_Garamond, Playfair_Display, Alex_Brush, Cinzel } from 'next/font/google';
import { StoreProvider } from '@/context/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import CartDrawer from '@/components/CartDrawer';
import QuickViewModal from '@/components/QuickViewModal';
import Toast from '@/components/Toast';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const alexBrush = Alex_Brush({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#641C2D',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://palluvo.com'),
  title: {
    default: 'PALLUVO | Every drape, a little magic | Contemporary Indian Luxury Sarees',
    template: '%s | PALLUVO Luxury Sarees',
  },
  description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear. 100% Silk Mark certified.',
  keywords: 'sarees, banarasi silk saree, kanjivaram silk, organza saree, paithani saree, bridal saree, luxury handloom',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://palluvo.com',
    siteName: 'PALLUVO',
    title: 'PALLUVO | Every drape, a little magic | Contemporary Indian Luxury Sarees',
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
    title: 'PALLUVO | Every drape, a little magic | Contemporary Indian Luxury Sarees',
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
    telephone: '+91 84988 54323',
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
    <html lang="en" className={`${plusJakartaSans.variable} ${cormorantGaramond.variable} ${playfairDisplay.variable} ${alexBrush.variable} ${cinzel.variable}`}>
      <head>
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
          <main className="flex-1 pb-[60px] lg:pb-0">
            {children}
          </main>
          <Footer />
          <BottomNav />
          <CartDrawer />
          <QuickViewModal />
          <Toast />
        </StoreProvider>
      </body>
    </html>
  );
}
