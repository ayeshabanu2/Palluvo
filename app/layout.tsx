import type { Metadata } from 'next';
import './globals.css';
import { ShopProvider } from '@/context/ShopContext';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { SearchModal } from '@/components/layout/SearchModal';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { WhatsAppConcierge } from '@/components/layout/WhatsAppConcierge';
import { ToastContainer } from '@/components/ui/ToastContainer';

export const metadata: Metadata = {
  title: 'PALLUVO — Every drape, a little magic. | Luxury Indian Sarees',
  description:
    'Contemporary luxury Indian saree fashion house. Curated signature handlooms: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, and 1-minute ready-to-wear drapes.',
  keywords: [
    'PALLUVO',
    'luxury sarees',
    'Kanjivaram silk',
    'Banarasi saree',
    'Chanderi',
    'Paithani',
    'Organza saree',
    'ready to wear saree',
    'Silk Mark certified',
    'Indian handlooms'
  ],
  authors: [{ name: 'PALLUVO Atelier' }],
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ShopProvider>
          <div className="site-wrapper">
            <AnnouncementBar />
            <Header />
            <main id="mainContent">{children}</main>
            <Footer />
            <MobileNavDrawer />
            <CartDrawer />
            <SearchModal />
            <QuickViewModal />
            <WhatsAppConcierge />
            <ToastContainer />
          </div>
        </ShopProvider>
      </body>
    </html>
  );
}
