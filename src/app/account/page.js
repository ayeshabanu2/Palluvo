'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, Package, Heart, MapPin, ShieldCheck, LogOut } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function AccountPage() {
  const { wishlist } = useStore();
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 border-b border-[#EDE3D5] gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-1">
            Member Privileges
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            My Atelier Account
          </h1>
          <p className="text-xs text-[#8E857B] mt-1">Ananya Sharma • ananya.sharma@example.com</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#B08D57]/15 text-[#8C6A35] text-xs font-bold px-3 py-1.5 rounded-full border border-[#B08D57]/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> PALLUVO Silk Circle Gold
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-8">
        
        {/* Navigation Sidebar */}
        <div className="space-y-1 bg-white p-4 rounded-xl border border-[#EDE3D5] shadow-xs h-fit">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'orders' ? 'bg-[#641C2D] text-white' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
            }`}
          >
            <Package className="w-4 h-4" /> My Orders (2)
          </button>
          <Link
            href="/wishlist"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#6D625D] hover:bg-[#F8F5EF] transition"
          >
            <span className="flex items-center gap-2.5"><Heart className="w-4 h-4" /> Wishlist</span>
            <span className="bg-[#B08D57] text-white text-[10px] px-1.5 py-0.5 rounded-full">{wishlist.length}</span>
          </Link>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'addresses' ? 'bg-[#641C2D] text-white' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
            }`}
          >
            <MapPin className="w-4 h-4" /> Saved Addresses
          </button>
        </div>

        {/* Content View */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#2B211D]">Recent Orders</h2>
              
              <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between text-xs pb-3 border-b border-[#EDE3D5] gap-2">
                  <div>
                    <span className="text-[#8E857B]">Order #</span>
                    <strong className="text-[#2B211D] font-mono ml-1">PLV-849201</strong>
                  </div>
                  <div>
                    <span className="text-[#8E857B]">Placed On: </span>
                    <span className="text-[#2B211D] font-medium">18 Sep 2026</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    Delivered
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                    <img src="/images/hero_saree_art.jpg" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-xs">
                    <h4 className="font-serif text-base font-bold text-[#2B211D]">Royal Banarasi Silk Saree</h4>
                    <p className="text-[#8E857B]">Deep Crimson • Custom Tailored Blouse</p>
                    <p className="font-bold text-[#641C2D] mt-1">₹8,199</p>
                  </div>
                  <Link
                    href="/sarees"
                    className="border border-[#EDE3D5] px-4 py-2 rounded-full text-xs font-semibold text-[#2B211D] hover:bg-[#F8F5EF]"
                  >
                    Buy Again
                  </Link>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between text-xs pb-3 border-b border-[#EDE3D5] gap-2">
                  <div>
                    <span className="text-[#8E857B]">Order #</span>
                    <strong className="text-[#2B211D] font-mono ml-1">PLV-712049</strong>
                  </div>
                  <div>
                    <span className="text-[#8E857B]">Placed On: </span>
                    <span className="text-[#2B211D] font-medium">02 Aug 2026</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    Delivered
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-16 h-20 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                    <img src="/images/categories/organza.jpg" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-xs">
                    <h4 className="font-serif text-base font-bold text-[#2B211D]">Elegant Organza Saree</h4>
                    <p className="text-[#8E857B]">Sage Green • Unstitched Blouse</p>
                    <p className="font-bold text-[#641C2D] mt-1">₹3,899</p>
                  </div>
                  <Link
                    href="/sarees"
                    className="border border-[#EDE3D5] px-4 py-2 rounded-full text-xs font-semibold text-[#2B211D] hover:bg-[#F8F5EF]"
                  >
                    Buy Again
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#2B211D]">Saved Delivery Addresses</h2>
              <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] shadow-xs text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#641C2D] uppercase tracking-wider">Home (Default)</span>
                </div>
                <p className="font-medium text-[#2B211D]">Ananya Sharma • +91 98765 43210</p>
                <p className="text-[#6D625D]">Apartment 402, Royal Palms, 12th Main Road, Indiranagar</p>
                <p className="text-[#6D625D]">Bengaluru, Karnataka - 560038</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
