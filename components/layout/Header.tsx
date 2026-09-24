'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useShop } from '@/context/ShopContext';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { cartCount, wishlistCount, openCartDrawer, openMobileNav, openSearch } = useShop();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'is-sticky scrolled' : ''}`} id="mainHeader">
      <div className="header-container">
        
        {/* Left Navigation (Desktop) */}
        <nav className="header-nav-left" aria-label="Primary Navigation">
          <Link href="/sarees?sort=newest" className={`nav-link ${pathname === '/sarees' ? 'active' : ''}`}>
            NEW ARRIVALS
          </Link>
          <Link href="/sarees?category=Kanjivaram" className="nav-link">
            KANJIVARAM
          </Link>
          <Link href="/sarees?category=Banarasi" className="nav-link">
            BANARASI
          </Link>
          <Link href="/sarees?category=Chanderi" className="nav-link">
            CHANDERI
          </Link>
          <Link href="/sarees?category=Paithani" className="nav-link">
            PAITHANI
          </Link>
          <Link href="/sarees?category=Organza" className="nav-link">
            ORGANZA
          </Link>
          <Link href="/sarees?category=Ready-to-Wear" className="nav-link">
            READY-TO-WEAR
          </Link>
          <Link href="/sarees" className="nav-link">
            ALL SAREES
          </Link>
          <Link href="/about" className={`nav-link ${pathname === '/about' ? 'active' : ''}`}>
            STORY
          </Link>
          <Link href="/contact" className={`nav-link ${pathname === '/contact' ? 'active' : ''}`}>
            CONTACT
          </Link>
        </nav>

        {/* Center: Brand Wordmark */}
        <div className="header-logo-center">
          <Link href="/" className="brand-logo" aria-label="PALLUVO Homepage">
            <span className="brand-name-text">PALLUVO</span>
            <span className="brand-tagline-sub">Every drape, a little magic.</span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="header-actions-right">
          {/* Instant Search */}
          <button
            type="button"
            className="header-action-icon"
            onClick={openSearch}
            aria-label="Search sarees"
            id="searchToggleBtn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          {/* Account */}
          <Link href="/account" className="header-action-icon" aria-label="My Account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="header-action-icon" aria-label="Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {wishlistCount > 0 && (
              <span className="header-action-badge wishlist-badge">{wishlistCount}</span>
            )}
          </Link>

          {/* Shopping Bag / Cart */}
          <button
            type="button"
            className="header-action-icon js-cart-drawer-trigger"
            onClick={openCartDrawer}
            aria-label="Shopping Bag"
            id="cartDrawerTrigger"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {cartCount > 0 && (
              <span className="header-action-badge cart-badge">{cartCount}</span>
            )}
          </button>

          {/* Mobile Menu Toggle Button: Visible on mobile screens, no inline display:none */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            id="mobileMenuToggle"
            onClick={openMobileNav}
            aria-label="Open mobile navigation menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

      </div>
    </header>
  );
};
