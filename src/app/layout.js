import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import QuickViewModal from '@/components/QuickViewModal';
import Toast from '@/components/Toast';

export const metadata = {
  title: 'PALLUVO — Every drape, a little magic | Contemporary Indian Luxury Sarees',
  description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear. 100% Silk Mark certified.',
  keywords: 'sarees, banarasi silk saree, kanjivaram silk, organza saree, paithani saree, bridal saree, luxury handloom'
};

export default function RootLayout({ children }) {
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
