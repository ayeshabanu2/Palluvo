'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { PALLUVO_TOP_MODELS } from '@/data/products';

export default function Header() {
  const router = useRouter();
  const { totalCartCount, wishlist, setIsCartOpen } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchModal(false);
      router.push(`/sarees?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <aside aria-label="Announcement" className="bg-[#2B211D] text-[#D6B878] text-xs py-2 px-4 tracking-wider text-center flex items-center justify-center gap-2 border-b border-[#3D302A]">
        <Sparkles className="w-3.5 h-3.5 text-[#B08D57] animate-pulse" />
        <span className="font-medium">THE FESTIVE EDIT</span> — 
        <span className="text-white/90">Complimentary Insured Shipping on Orders Above ₹999</span>
        <span className="hidden md:inline text-white/50">| Use Code: <span className="text-[#D6B878] font-bold">PALLUVO10</span> for 10% Off</span>
      </aside>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 bg-[#F8F5EF]/95 backdrop-blur-md border-b border-[#EDE3D5] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            
            {/* Mobile menu trigger */}
            <div className="flex items-center lg:hidden">
              <button 
                id="mobileMenuToggle"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-[#241F1D] hover:text-[#641C2D]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Brand Logo & Tagline */}
            <div className="flex-1 lg:flex-none text-center lg:text-left">
              <Link href="/" className="inline-block group">
                <span className="font-serif text-3xl sm:text-4xl tracking-[0.22em] text-[#641C2D] font-bold uppercase block transition-transform group-hover:scale-[1.01]">
                  PALLUVO
                </span>
                <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-[#B08D57] font-sans block -mt-1 font-semibold">
                  Every drape, a little magic.
                </span>
              </Link>
            </div>

            {/* Desktop Direct Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Kanjivaram, Banarasi, Organza..."
                  className="w-full bg-[#FFFFFF] border border-[#EDE3D5] rounded-full pl-11 pr-4 py-2.5 text-sm text-[#241F1D] placeholder-[#8E857B] focus:outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] shadow-xs transition"
                />
                <Search className="w-4 h-4 text-[#8E857B] absolute left-4 top-3.5" />
                {searchQuery && (
                  <button
                    type="submit"
                    className="absolute right-2 top-2 px-3 py-1 bg-[#641C2D] text-white text-xs rounded-full hover:bg-[#4E1422] transition"
                  >
                    Search
                  </button>
                )}
              </form>
            </div>

            {/* Actions: Search (Mobile), Account, Wishlist, Bag */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={() => setShowSearchModal(true)}
                className="lg:hidden p-2 text-[#241F1D] hover:text-[#641C2D]"
                aria-label="Search sarees"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link
                href="/account"
                className="hidden sm:flex items-center gap-1.5 p-2 text-[#241F1D] hover:text-[#641C2D] text-xs font-medium tracking-wider uppercase transition"
              >
                <User className="w-5 h-5" />
                <span className="hidden xl:inline">Account</span>
              </Link>

              <Link
                href="/wishlist"
                className="relative p-2 text-[#241F1D] hover:text-[#641C2D] transition"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#B08D57] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 bg-[#641C2D] hover:bg-[#4E1422] text-white px-3.5 sm:px-4 py-2.5 rounded-full text-xs font-semibold tracking-wider transition shadow-sm"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">BAG</span>
                <span className="bg-[#B08D57] text-[#241F1D] text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
                  {totalCartCount}
                </span>
              </button>
            </div>
          </div>

          {/* Saree-Only Curated Category Sub-Nav Bar */}
          <nav aria-label="Saree Collections" className="hidden lg:flex items-center justify-center gap-5 xl:gap-8 py-2.5 border-t border-[#EDE3D5]/80 text-[12px] xl:text-[13px] tracking-[0.12em] xl:tracking-[0.14em] uppercase font-medium text-[#2B211D] whitespace-nowrap overflow-hidden">
            <Link href="/sarees?badge=New+Arrival" className="hover:text-[#641C2D] text-[#8C6A35] font-semibold transition shrink-0">
              New Arrivals
            </Link>
            <Link href="/sarees?type=Kanjivaram" className="hover:text-[#641C2D] transition shrink-0">
              Kanjivaram
            </Link>
            <Link href="/sarees?type=Banarasi" className="hover:text-[#641C2D] transition shrink-0">
              Banarasi
            </Link>
            <Link href="/sarees?type=Paithani" className="hover:text-[#641C2D] transition shrink-0">
              Paithani
            </Link>
            <Link href="/sarees?type=Chanderi" className="hover:text-[#641C2D] transition shrink-0">
              Chanderi
            </Link>
            <Link href="/sarees?type=Organza" className="hover:text-[#641C2D] transition shrink-0">
              Organza
            </Link>
            <Link href="/sarees?type=Ready-to-Wear" className="hover:text-[#641C2D] transition text-[#641C2D] font-semibold shrink-0">
              Ready-To-Wear
            </Link>
            <Link href="/sarees" className="hover:text-[#641C2D] transition border-b border-transparent hover:border-[#641C2D] shrink-0">
              All Sarees
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div id="mobileMenuDrawer" className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-[#F8F5EF] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#EDE3D5]">
                <span className="font-serif text-2xl tracking-[0.2em] text-[#641C2D] font-bold">PALLUVO</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[#241F1D]" aria-label="Close menu">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-4 text-sm font-medium tracking-wider uppercase text-[#2B211D]">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#641C2D] py-1 border-b border-[#EDE3D5]/50">
                  Home
                </Link>
                <Link href="/sarees" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#641C2D] py-1 border-b border-[#EDE3D5]/50 font-bold text-[#641C2D]">
                  All Sarees (Full Catalog)
                </Link>
                {PALLUVO_TOP_MODELS.slice(0, 6).map((model) => (
                  <Link
                    key={model.id}
                    href={`/sarees?type=${encodeURIComponent(model.filterType)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#641C2D] py-1 border-b border-[#EDE3D5]/50 flex items-center justify-between"
                  >
                    <span>{model.name}</span>
                    <span className="text-[11px] text-[#B08D57] lowercase font-serif italic">{model.region}</span>
                  </Link>
                ))}
                <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#641C2D] py-1">
                  About Atelier
                </Link>
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#641C2D] py-1">
                  Concierge & Contact
                </Link>
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="hover:text-[#641C2D] py-1">
                  My Orders & Profile
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-[#EDE3D5] text-xs text-[#6D625D]">
              <div className="flex items-center gap-2 text-[#B08D57] font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" /> 100% Certified Pure Handloom
              </div>
              <p>Crafted in India. Worldwide shipping available.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Full Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setShowSearchModal(false)}
              className="absolute top-4 right-4 text-[#8E857B] hover:text-black"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-serif text-2xl text-[#2B211D] mb-4">Discover Signature Sarees</h3>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by silk type, color, region, or weave..."
                className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg pl-12 pr-4 py-3 text-base text-[#241F1D] focus:outline-none focus:border-[#641C2D]"
              />
              <Search className="w-5 h-5 text-[#8E857B] absolute left-4 top-3.5" />
              <button
                type="submit"
                className="w-full mt-4 bg-[#641C2D] text-white py-3 rounded-lg font-medium text-sm tracking-wider uppercase hover:bg-[#4E1422] transition"
              >
                Search Catalog
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
