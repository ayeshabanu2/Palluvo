'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';

export const Footer: React.FC = () => {
  const { showToast } = useShop();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setSubscribed(true);
    showToast('Welcome to the PALLUVO Saree Circle! Check your inbox for your 10% welcome privilege.', 'success');
    setEmail('');
  };

  return (
    <footer className="footer" id="mainFooter">
      {/* Top Value Pillars */}
      <div className="footer-pillars">
        <div className="container">
          <div className="pillars-grid">
            <div className="pillar-item">
              <span className="pillar-icon">🏺</span>
              <div className="pillar-text">
                <h4>100% Authentic Handlooms</h4>
                <p>Direct from master weaving clusters across India</p>
              </div>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">🎖️</span>
              <div className="pillar-text">
                <h4>Silk Mark Certified</h4>
                <p>Guaranteed natural silk purity and tested gold zari</p>
              </div>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">🔒</span>
              <div className="pillar-text">
                <h4>Secure Indian Payments</h4>
                <p>Instant UPI, RuPay, Cards &amp; Cash on Delivery</p>
              </div>
            </div>
            <div className="pillar-item">
              <span className="pillar-icon">📦</span>
              <div className="pillar-text">
                <h4>Insured Express Delivery</h4>
                <p>Dispatched in 24 hours with Blue Dart Air across India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Column 1: Brand & Atelier */}
            <div className="footer-col brand-col">
              <Link href="/" className="footer-logo">
                <span className="brand-name-text">PALLUVO</span>
                <span className="brand-tagline-sub">Every drape, a little magic.</span>
              </Link>
              <p className="footer-about-text">
                PALLUVO is a contemporary Indian luxury saree fashion house dedicated to preserving ancient weaving traditions with museum-grade craftsmanship and modern editorial elegance.
              </p>
              <div className="footer-contact-details">
                <p>
                  <strong>Flagship Atelier:</strong> Kavuri Hills Road, Madhapur, Hitech City, Hyderabad, Telangana 500081
                </p>
                <p>
                  <strong>Email:</strong> <a href="mailto:contact@palluvo.com">contact@palluvo.com</a>
                </p>
                <p>
                  <strong>Concierge:</strong> <a href="tel:+918498854323">+91 84988 54323</a> &bull; <a href="tel:+918106789789">+91 81067 89789</a>
                </p>
              </div>
            </div>

            {/* Column 2: Signature Collections */}
            <div className="footer-col">
              <h4 className="footer-heading">Signature Drapes</h4>
              <ul className="footer-links">
                <li><Link href="/sarees?category=Kanjivaram">Kanjivaram Temple Silk</Link></li>
                <li><Link href="/sarees?category=Banarasi">Varanasi Kadhwa Banarasi</Link></li>
                <li><Link href="/sarees?category=Paithani">Imperial Paithani Peacocks</Link></li>
                <li><Link href="/sarees?category=Chanderi">Gossamer Chanderi Tissue</Link></li>
                <li><Link href="/sarees?category=Organza">Embroidered Zardozi Organza</Link></li>
                <li><Link href="/sarees?category=Ready-to-Wear">1-Minute Ready Drape</Link></li>
                <li><Link href="/sarees?category=Pochampally">Pochampally Double Ikat</Link></li>
                <li><Link href="/sarees?category=Mysore Silk">Mysore Gold Zari Crepe</Link></li>
              </ul>
            </div>

            {/* Column 3: Client Concierge */}
            <div className="footer-col">
              <h4 className="footer-heading">Client Concierge</h4>
              <ul className="footer-links">
                <li><Link href="/contact">Boutique Atelier &amp; Contact</Link></li>
                <li><Link href="/account">Track My Order (Blue Dart)</Link></li>
                <li><Link href="/about">Our Weaver Story &amp; Manifesto</Link></li>
                <li><Link href="/cart">My Shopping Bag</Link></li>
                <li><Link href="/wishlist">Saved Wishlist</Link></li>
                <li><a href="https://wa.me/918498854323" target="_blank" rel="noopener noreferrer">WhatsApp Stylist (+91 84988 54323)</a></li>
                <li><Link href="/contact#faq">Shipping, Customs &amp; Returns</Link></li>
                <li><Link href="/about#purity">Silk Mark Purity Verification</Link></li>
              </ul>
            </div>

            {/* Column 4: Newsletter Subscription */}
            <div className="footer-col newsletter-col">
              <h4 className="footer-heading">Join The Saree Circle</h4>
              <p className="newsletter-desc">
                Receive private invitations to limited artisan drops, festive edits, and curated draping masterclasses.
              </p>
              {subscribed ? (
                <div className="newsletter-success">
                  ✨ Thank you for subscribing to PALLUVO!
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="footer-newsletter-form">
                  <input
                    type="email"
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="newsletter-input"
                    required
                  />
                  <button type="submit" className="newsletter-submit-btn">
                    SUBSCRIBE
                  </button>
                </form>
              )}
              <div className="newsletter-trust-note">
                🔒 We respect your privacy. Zero spam, only pure handloom poetry.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="container">
          <div className="bottom-bar-content">
            <p className="copyright-text">
              &copy; {new Date().getFullYear()} PALLUVO Luxury Fashion House. All rights reserved. Crafting Indian magic, one drape at a time.
            </p>

            <div className="payment-badges-wrap">
              <span className="payment-label">Accepted Modes:</span>
              <span className="pay-pill">UPI / QR</span>
              <span className="pay-pill">Google Pay</span>
              <span className="pay-pill">PhonePe</span>
              <span className="pay-pill">RuPay</span>
              <span className="pay-pill">Visa</span>
              <span className="pay-pill">Mastercard</span>
              <span className="pay-pill">NetBanking</span>
              <span className="pay-pill">Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
