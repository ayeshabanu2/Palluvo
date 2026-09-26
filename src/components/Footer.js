import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Award, Truck, RotateCcw, Lock, Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#2B211D] text-[#EDE3D5] pt-16 pb-12 border-t border-[#3D302A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 5 Core Trust Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pb-14 border-b border-[#3D302A] text-center">
          <div className="flex flex-col items-center">
            <Award className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Authentic Weaves</h4>
            <p className="text-xs text-[#8E857B] mt-1">Direct from master artisan clusters</p>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Silk Mark Assured</h4>
            <p className="text-xs text-[#8E857B] mt-1">100% natural pure silk certified</p>
          </div>
          <div className="flex flex-col items-center">
            <Truck className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Express Insured</h4>
            <p className="text-xs text-[#8E857B] mt-1">Dispatched within 24 hours</p>
          </div>
          <div className="flex flex-col items-center">
            <RotateCcw className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Easy 7-Day Returns</h4>
            <p className="text-xs text-[#8E857B] mt-1">Hassle-free doorstep pickup</p>
          </div>
          <div className="col-span-2 md:col-span-1 flex flex-col items-center">
            <Lock className="w-8 h-8 text-[#D6B878] mb-2" />
            <h4 className="text-white text-sm font-semibold tracking-wider uppercase">Secure Checkout</h4>
            <p className="text-xs text-[#8E857B] mt-1">UPI, Cards, NetBanking & COD</p>
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
            <p className="text-xs text-[#8E857B] leading-relaxed">
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
            <h4 className="text-sm font-semibold tracking-wider uppercase text-white mb-3">Join The Saree Circle</h4>
            <p className="text-xs text-[#8E857B] mb-4">
              Receive private preview invitations, silk care guides, and exclusive festive privileges.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-[#1F1714] border border-[#3D302A] px-3 py-2 text-xs text-white placeholder-[#8E857B] rounded-l-md focus:outline-none focus:border-[#D6B878] flex-1"
              />
              <button className="bg-[#B08D57] hover:bg-[#8C6A35] text-white px-4 py-2 text-xs font-semibold rounded-r-md transition tracking-wider uppercase">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#8E857B] gap-4">
          <p>© {new Date().getFullYear()} PALLUVO Luxury Fashion House. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              100% Pure Saree Merchandising
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Award className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              Handloom Certified
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-[#B08D57] shrink-0" />
              Silk Mark Guarantee
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
