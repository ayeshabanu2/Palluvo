import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Award, Truck, RotateCcw, Lock, Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#2B211D] text-[#EDE3D5] pt-16 pb-12 border-t border-[#3D302A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Core Customer Guarantees (Fulfillment & Protection) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-14 border-b border-[#3D302A] text-center">
          <div className="flex flex-col items-center">
            <Truck className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Express Insured Delivery</h4>
            <p className="text-xs text-[#B8B0A5] mt-1">Complimentary dispatch within 24 hours across India</p>
          </div>
          <div className="flex flex-col items-center">
            <RotateCcw className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Easy 7-Day Returns</h4>
            <p className="text-xs text-[#B8B0A5] mt-1">Hassle-free doorstep pickup & exchange</p>
          </div>
          <div className="flex flex-col items-center">
            <Lock className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">100% Secure Checkout</h4>
            <p className="text-xs text-[#B8B0A5] mt-1">256-bit encrypted UPI, Cards, NetBanking & COD</p>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 py-12 border-b border-[#3D302A]">
          {/* Brand Info */}
          <div>
            <span className="font-serif text-3xl tracking-[0.22em] text-[#D6B878] font-bold uppercase block mb-3">
              PALLUVO
            </span>
            <p className="text-xs tracking-[0.16em] uppercase text-[#B8B0A5] mb-4 font-semibold">
              Every drape, a little magic.
            </p>
            <p className="text-xs text-[#B8B0A5] leading-relaxed">
              A contemporary Indian luxury saree fashion house dedicated exclusively to 100% authentic handloom sarees. Honoring master weavers with timeless drapes.
            </p>
          </div>

          {/* Signature Drapes */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-4">Signature Weaves</h4>
            <ul className="space-y-2 text-xs text-[#B8B0A5]">
              <li><Link href="/sarees?type=Kanjivaram" className="hover:text-[#D6B878] transition">Kanchipuram Silk</Link></li>
              <li><Link href="/sarees?type=Banarasi" className="hover:text-[#D6B878] transition">Varanasi Katan Banarasi</Link></li>
              <li><Link href="/sarees?type=Paithani" className="hover:text-[#D6B878] transition">Yeola Paithani Peacock</Link></li>
              <li><Link href="/sarees?type=Chanderi" className="hover:text-[#D6B878] transition">Chanderi Silk Tissue</Link></li>
              <li><Link href="/sarees?type=Organza" className="hover:text-[#D6B878] transition">Hand-Cut Organza Sheer</Link></li>
              <li><Link href="/sarees?type=Ready-to-Wear" className="hover:text-[#D6B878] transition">1-Minute Ready Drape</Link></li>
            </ul>
          </div>

          {/* Concierge & Care */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-4">Concierge & Help</h4>
            <ul className="space-y-2 text-xs text-[#B8B0A5]">
              <li><Link href="/about" className="hover:text-[#D6B878] transition">About Palluvo Atelier</Link></li>
              <li><Link href="/contact" className="hover:text-[#D6B878] transition">Contact & Stylist Assistance</Link></li>
              <li><Link href="/cart" className="hover:text-[#D6B878] transition">Shopping Bag & Checkout</Link></li>
              <li><Link href="/account" className="hover:text-[#D6B878] transition">Track Orders & Account</Link></li>
              <li><Link href="/wishlist" className="hover:text-[#D6B878] transition">Saved Wishlist</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold tracking-wider uppercase text-white">Join The Saree Circle</h4>
              <span className="bg-[#B08D57]/20 text-[#D6B878] text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-[#B08D57]/30">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-[#B8B0A5] mb-4">
              Private preview invitations, silk care guides, and exclusive festive privileges launching soon.
            </p>
            <div className="flex" aria-disabled="true">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address for newsletter (Subscriptions launching soon)
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                disabled
                aria-disabled="true"
                aria-label="Newsletter subscriptions opening soon"
                placeholder="Subscriptions opening soon..."
                className="bg-[#1F1714]/60 border border-[#3D302A] px-3 py-2 text-xs text-[#B8B0A5] placeholder-[#B8B0A5]/80 rounded-l-md cursor-not-allowed flex-1 focus:outline-none"
              />
              <button 
                type="button"
                disabled
                aria-disabled="true"
                className="bg-[#3D302A] text-[#B8B0A5] px-4 py-2 text-xs font-semibold rounded-r-md tracking-wider uppercase cursor-not-allowed shrink-0 border border-l-0 border-[#3D302A]"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#B8B0A5] gap-4">
          <p>© {new Date().getFullYear()} PALLUVO Luxury Fashion House. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              Verified Boutique Atelier
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              SSL Encrypted Transactions
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Truck className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              Pan-India & Global Dispatch
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
