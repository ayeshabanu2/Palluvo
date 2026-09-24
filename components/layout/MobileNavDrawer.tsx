'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';

export const MobileNavDrawer: React.FC = () => {
  const { isMobileNavOpen, closeMobileNav, wishlistCount } = useShop();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [isMobileNavOpen]);

  return (
    <>
      <div className={`mobile-drawer ${isMobileNavOpen ? 'is-open' : ''}`} id="mobileMenuDrawer">
        <div className="mobile-drawer-header">
          <div>
            <span className="brand-name-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>PALLUVO</span>
            <span className="brand-tagline-sub" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Every drape, a little magic.
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            id="mobileMenuClose"
            onClick={closeMobileNav}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <nav className="mobile-drawer-nav" aria-label="Mobile Navigation">
          <Link href="/sarees?sort=newest" className="mobile-nav-link" onClick={closeMobileNav}>
            NEW ARRIVALS <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Kanjivaram" className="mobile-nav-link" onClick={closeMobileNav}>
            KANJIVARAM SILK <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Banarasi" className="mobile-nav-link" onClick={closeMobileNav}>
            BANARASI HEIRLOOM <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Chanderi" className="mobile-nav-link" onClick={closeMobileNav}>
            CHANDERI HANDLOOM <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Paithani" className="mobile-nav-link" onClick={closeMobileNav}>
            PAITHANI SILK <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Pochampally" className="mobile-nav-link" onClick={closeMobileNav}>
            POCHAMPALLY IKAT <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Organza" className="mobile-nav-link" onClick={closeMobileNav}>
            ORGANZA SHEER <span>&rarr;</span>
          </Link>
          <Link href="/sarees?category=Ready-to-Wear" className="mobile-nav-link" onClick={closeMobileNav}>
            READY-TO-WEAR (1-MIN) <span>&rarr;</span>
          </Link>
          <Link href="/sarees" className="mobile-nav-link" onClick={closeMobileNav} style={{ fontWeight: 600 }}>
            ALL SAREES <span>&rarr;</span>
          </Link>
          <Link href="/about" className="mobile-nav-link" onClick={closeMobileNav}>
            OUR WEAVER STORY <span>&rarr;</span>
          </Link>
          <Link href="/contact" className="mobile-nav-link" onClick={closeMobileNav}>
            CONCIERGE & ATELIER <span>&rarr;</span>
          </Link>
          <Link href="/wishlist" className="mobile-nav-link" onClick={closeMobileNav}>
            SAVED WISHLIST {wishlistCount > 0 ? `(${wishlistCount})` : ''} <span>&rarr;</span>
          </Link>
          <Link href="/account" className="mobile-nav-link" onClick={closeMobileNav}>
            MY ACCOUNT & TRACKING <span>&rarr;</span>
          </Link>
        </nav>

        <div className="mobile-drawer-footer">
          <p>🇮🇳 India &bull; Indian Rupee (₹)</p>
          <p style={{ marginTop: '0.4rem', color: 'var(--text-muted)' }}>
            Concierge: <a href="tel:+918498854323" style={{ color: 'var(--color-gold)' }}>+91 84988 54323</a>
          </p>
          <p style={{ marginTop: '0.4rem', fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--color-gold)' }}>
            “Every drape, a little magic.”
          </p>
        </div>
      </div>

      {isMobileNavOpen && (
        <div
          className="mobile-backdrop is-open"
          id="mobileMenuBackdrop"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}
    </>
  );
};
