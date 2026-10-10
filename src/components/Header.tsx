'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { Search, Heart, ShoppingBag, User, Menu, X, Sparkles } from 'lucide-react';
import { PALLUVO_TOP_MODELS } from '@/data/products';
import { useBodyScrollLock } from '@/utils/useBodyScrollLock';

interface NavItem {
  label: string;
  href: string;
  badge: string | null;
  type: string | null;
  isAll: boolean;
  special?: string;
}

function CategoryNav(): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type') || null;
  const currentBadge = searchParams?.get('badge') || null;

  const isNavActive = (type: string | null, badge: string | null, isAll: boolean): boolean => {
    if (isAll) {
      return pathname === '/sarees' && !currentType && !currentBadge;
    }
    if (badge) {
      return currentBadge === badge;
    }
    if (type) {
      return currentType?.toLowerCase() === type?.toLowerCase();
    }
    return false;
  };

  const navItems: NavItem[] = [
    { label: 'New Arrivals', href: '/sarees?badge=New+Arrival', badge: 'New Arrival', type: null, isAll: false, special: 'text-[#8C6A35]' },
    { label: 'Kanjivaram', href: '/sarees?type=Kanjivaram', badge: null, type: 'Kanjivaram', isAll: false },
    { label: 'Banarasi', href: '/sarees?type=Banarasi', badge: null, type: 'Banarasi', isAll: false },
    { label: 'Paithani', href: '/sarees?type=Paithani', badge: null, type: 'Paithani', isAll: false },
    { label: 'Chanderi', href: '/sarees?type=Chanderi', badge: null, type: 'Chanderi', isAll: false },
    { label: 'Organza', href: '/sarees?type=Organza', badge: null, type: 'Organza', isAll: false },
    { label: 'Ready-To-Wear', href: '/sarees?type=Ready-to-Wear', badge: null, type: 'Ready-to-Wear', isAll: false, special: 'text-[#641C2D]' },
    { label: 'All Sarees', href: '/sarees', badge: null, type: null, isAll: true }
  ];

  return (
    <nav aria-label="Saree Collections" className="hidden lg:flex items-center justify-center gap-4 xl:gap-8 py-2 border-t border-[#EDE3D5]/80 text-[12px] xl:text-[13px] tracking-[0.12em] xl:tracking-[0.14em] uppercase font-medium text-[#2B211D] whitespace-nowrap overflow-x-auto flex-nowrap">
      {navItems.map((item) => {
        const active = isNavActive(item.type, item.badge, item.isAll);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`transition shrink-0 whitespace-nowrap pb-0.5 border-b-2 ${
              active
                ? 'text-[#641C2D] border-[#641C2D] font-bold'
                : `border-transparent hover:text-[#641C2D] hover:border-[#641C2D]/40 ${item.special || 'text-[#2B211D]'}`
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Header(): React.JSX.Element {
  const router = useRouter();
  const { totalCartCount, wishlist, setIsCartOpen, showToast } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchDialogRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  // Lock background body scroll when either mobile menu drawer or search modal is open
  useBodyScrollLock(mobileMenuOpen || showSearchModal);

  // Manage accessibility, focus trap, and Escape dismissal for mobile navigation drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;

    // Move focus into the drawer once rendered
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileMenuOpen(false);
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const triggerEl = menuTriggerRef.current;
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the trigger button that opened the drawer
      if (triggerEl) {
        triggerEl.focus();
      }
    };
  }, [mobileMenuOpen]);

  // Manage accessibility, focus trap, and Escape dismissal for search modal dialog
  useEffect(() => {
    if (!showSearchModal) return;

    // Move focus into the search input once dialog is mounted
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (searchCloseBtnRef.current) {
        searchCloseBtnRef.current.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSearchModal(false);
        return;
      }

      if (e.key === 'Tab' && searchDialogRef.current) {
        const focusable = searchDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const triggerEl = searchTriggerRef.current;
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the trigger button that opened search modal
      if (triggerEl) {
        triggerEl.focus();
      }
    };
  }, [showSearchModal]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchModal(false);
      router.push(`/sarees?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const copyPromoCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('PALLUVO10');
    }
    if (showToast) {
      showToast('Promo code "PALLUVO10" copied to clipboard!');
    }
  };

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <aside aria-label="Announcement" className="hidden sm:flex bg-[#2B211D] text-[#D6B878] text-[11px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-4 tracking-wider text-center items-center justify-center gap-1.5 sm:gap-2 border-b border-[#3D302A] overflow-hidden whitespace-nowrap">
        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#B08D57] animate-pulse shrink-0" />
        <Link href="/sarees?occasion=Festive" className="font-semibold hover:underline text-[#D6B878] transition shrink-0">
          THE FESTIVE EDIT
        </Link>
        <span className="shrink-0 text-[#D6B878]/60">|</span>
        <span className="text-white/90 truncate">
          <span className="hidden sm:inline">Free insured shipping on orders ₹999+</span>
          <span className="sm:hidden">Free shipping on ₹999+</span>
        </span>
        <span className="hidden md:inline text-white/50">| Use Code: </span>
        <button
          onClick={copyPromoCode}
          title="Click to copy coupon code"
          className="hidden md:inline-flex items-center gap-1 bg-[#3D302A] hover:bg-[#641C2D] text-[#D6B878] hover:text-white px-2 py-0.5 rounded text-[11px] font-bold tracking-wider transition cursor-pointer border border-[#B08D57]/40"
        >
          PALLUVO10
        </button>
        <span className="hidden md:inline text-white/50">for 10% Off</span>
      </aside>

      {/* Main Luxury Header */}
      <header className="sticky top-0 z-40 w-full bg-[#F8F5EF]/95 backdrop-blur-md border-b border-[#EDE3D5] shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-1 xs:px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[88px] sm:min-h-[104px] py-2 gap-1 xs:gap-1.5 sm:gap-4 header-main-row">
            
            {/* Mobile menu trigger */}
            <div className="flex items-center lg:hidden shrink-0">
              <button 
                ref={menuTriggerRef}
                id="mobileMenuToggle"
                onClick={() => setMobileMenuOpen(true)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] transition-colors rounded-full"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobileMenuDrawer"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Brand Logo & Tagline */}
            <div className="flex-1 min-w-0 lg:flex-none flex justify-center">
              <Link href="/" className="flex flex-col items-center group max-w-full" aria-label="PALLUVO home">
                {/* Crop the logo's built-in empty margin so the badge fills the box */}
                <span className="block relative overflow-hidden h-14 w-10 sm:h-16 sm:w-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/palluvo-logo.png"
                    alt="PALLUVO"
                    className="absolute inset-0 h-full w-full object-cover scale-[1.35] mix-blend-multiply transition-transform group-hover:scale-[1.4]"
                  />
                </span>
                <span className="mt-1 text-[8px] sm:text-[10px] md:text-[11px] tracking-[0.12em] sm:tracking-[0.2em] md:tracking-[0.28em] uppercase text-[#665E57] font-sans font-semibold whitespace-nowrap leading-tight">
                  Every drape, a little magic.
                </span>
              </Link>
            </div>

            {/* Desktop Direct Search Bar */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full" role="search">
                <label htmlFor="desktopSearchInput" className="sr-only">
                  Search sarees catalog
                </label>
                <input
                  id="desktopSearchInput"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Kanjivaram, Banarasi, Organza"
                  aria-label="Search sarees catalog"
                  className="w-full bg-[#FFFFFF] border border-[#EDE3D5] rounded-full pl-11 pr-20 py-2.5 text-sm text-[#241F1D] placeholder-[#665E57] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] shadow-xs transition"
                />
                <button
                  type="submit"
                  className="absolute left-3.5 top-3 text-[#665E57] hover:text-[#641C2D] transition"
                  aria-label="Submit search"
                >
                  <Search className="w-4 h-4" />
                </button>
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
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-4 shrink-0">
              <button 
                ref={searchTriggerRef}
                id="searchModalToggle"
                onClick={() => setShowSearchModal(true)}
                className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] transition-colors rounded-full"
                aria-label="Search sarees"
                aria-expanded={showSearchModal}
                aria-controls="searchModal"
              >
                <Search className="w-5 h-5" />
              </button>

              <div className="relative group hidden lg:block">
                <Link
                  href="/account"
                  aria-label="Account"
                  title="Account"
                  className="flex items-center gap-1.5 px-3 min-h-[44px] text-[#241F1D] hover:text-[#641C2D] text-xs font-medium tracking-wider uppercase transition rounded-full"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden xl:inline">Account</span>
                </Link>

                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-white shadow-2xl rounded-xl border border-[#EDE3D5] p-5 flex flex-col gap-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#2B211D]">Welcome to PALLUVO</h4>
                      <p className="text-xs text-[#6D625D] mt-1">To access your account</p>
                    </div>
                    
                    <Link href="/register" className="w-full bg-[#641C2D] text-white text-center py-2.5 rounded-lg text-sm font-bold tracking-wider hover:bg-[#4E1422] transition">
                      Sign Up
                    </Link>
                    
                    <Link href="/login" className="w-full bg-transparent text-[#641C2D] border border-[#641C2D] text-center py-2.5 rounded-lg text-sm font-bold tracking-wider hover:bg-[#F8F5EF] transition">
                      User Login
                    </Link>

                    <div className="h-px bg-[#EDE3D5] w-full my-1"></div>

                    <Link href="/account" className="flex items-center gap-3 text-sm text-[#2B211D] font-medium hover:text-[#641C2D] transition">
                      <ShoppingBag className="w-4 h-4" /> My Orders
                    </Link>
                  </div>
                </div>
              </div>

              <Link
                href="/wishlist"
                className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] transition-colors rounded-full"
                aria-label={wishlist.length > 0 ? `Wishlist (${wishlist.length} items)` : "Wishlist"}
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#B08D57] text-white text-[9.5px] sm:text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="hidden lg:flex relative w-11 h-11 min-w-[44px] min-h-[44px] sm:w-auto sm:min-w-0 sm:h-11 sm:px-4 items-center justify-center sm:gap-2 bg-[#641C2D] hover:bg-[#4E1422] text-white rounded-full transition shadow-sm cursor-pointer shrink-0"
                aria-label={totalCartCount > 0 ? `Shopping bag (${totalCartCount} items)` : "Shopping bag"}
                aria-haspopup="dialog"
              >
                <ShoppingBag className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-semibold tracking-wider">BAG</span>
                <span className="absolute top-1 right-1 sm:static w-4 h-4 sm:w-auto sm:h-auto bg-[#D6B878] text-[#241F1D] text-[9.5px] sm:text-[11px] font-bold rounded-full flex items-center justify-center sm:px-1.5 sm:py-0.2 sm:min-w-4 text-center">
                  {totalCartCount}
                </span>
              </button>
            </div>
          </div>

          {/* Saree-Only Curated Category Sub-Nav Bar */}
          <Suspense fallback={
            <nav aria-label="Saree Collections" className="hidden lg:flex items-center justify-center gap-4 xl:gap-8 py-2 border-t border-[#EDE3D5]/80 text-[12px] xl:text-[13px] tracking-[0.12em] uppercase font-medium text-[#2B211D]">
              <span className="shrink-0">New Arrivals</span>
              <span className="shrink-0">Kanjivaram</span>
              <span className="shrink-0">Banarasi</span>
              <span className="shrink-0">All Sarees</span>
            </nav>
          }>
            <CategoryNav />
          </Suspense>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div 
          id="mobileMenuDrawer" 
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobileMenuTitle"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            onClick={() => setMobileMenuOpen(false)} 
            aria-hidden="true"
          />
          <div 
            ref={drawerRef}
            className="relative w-4/5 max-w-sm bg-[#F8F5EF] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#EDE3D5]">
                <span id="mobileMenuTitle" className="font-serif text-2xl tracking-[0.2em] text-[#641C2D] font-bold">PALLUVO</span>
                <button 
                  ref={closeButtonRef}
                  onClick={() => setMobileMenuOpen(false)} 
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] transition-colors rounded-full" 
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav aria-label="Mobile navigation links" className="mt-6 flex flex-col gap-4 text-sm font-medium tracking-wider uppercase text-[#2B211D]">
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
              </nav>
            </div>

            <div className="pt-6 border-t border-[#EDE3D5] text-xs text-[#6D625D]">
              <div className="flex items-center gap-2 text-[#641C2D] font-semibold mb-1">
                <span className="w-2 h-2 rounded-full bg-[#B08D57]" /> 100% Certified Pure Handloom
              </div>
              <p>Crafted in India. Worldwide shipping available.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Full Search Modal */}
      {showSearchModal && (
        <div 
          id="searchModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="searchModalTitle"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        >
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs" 
            onClick={() => setShowSearchModal(false)} 
            aria-hidden="true"
          />
          <div 
            ref={searchDialogRef}
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 z-10"
          >
            <button 
              ref={searchCloseBtnRef}
              onClick={() => setShowSearchModal(false)}
              className="absolute top-3 right-3 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#665E57] hover:text-black transition-colors rounded-full"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 id="searchModalTitle" className="font-serif text-2xl text-[#2B211D] mb-4">Discover Signature Sarees</h3>
            <form onSubmit={handleSearchSubmit} className="relative" role="search">
              <label htmlFor="overlaySearchInput" className="sr-only">
                Search signature sarees
              </label>
              <input
                ref={searchInputRef}
                id="overlaySearchInput"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by silk type, color, region, or weave"
                aria-label="Search by silk type, color, region, or weave"
                className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg pl-12 pr-4 py-3 text-base text-[#241F1D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
              />
              <Search className="w-5 h-5 text-[#665E57] absolute left-4 top-3.5" aria-hidden="true" />
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
