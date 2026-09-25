'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { formatINR } from '@/utils/format';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    subtotal,
    shippingFee,
    discountAmount,
    grandTotal,
    coupon,
    removeCoupon
  } = useStore();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F8F5EF] shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EDE3D5] flex items-center justify-between bg-white">
            <div>
              <h2 className="font-serif text-2xl text-[#2B211D] font-bold">Shopping Bag</h2>
              <p className="text-xs text-[#8E857B]">
                {cart.length === 0 ? 'Your bag is empty' : `${cart.reduce((s, i) => s + i.qty, 0)} signature item(s)`}
              </p>
            </div>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#2B211D] hover:text-[#641C2D] rounded-full hover:bg-[#F8F5EF] transition"
              aria-label="Close bag"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="bg-[#EDE3D5]/60 px-6 py-3 border-b border-[#EDE3D5] text-xs">
            {subtotal >= 999 ? (
              <p className="text-[#134E4A] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#B08D57]" /> You have unlocked COMPLIMENTARY Express Shipping!
              </p>
            ) : (
              <div>
                <p className="text-[#6D625D]">
                  Add <span className="font-bold text-[#641C2D]">{formatINR(999 - subtotal)}</span> more for Free Express Shipping
                </p>
                <div className="w-full bg-[#EDE3D5] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-[#B08D57] h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / 999) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-[#EDE3D5] flex items-center justify-center mx-auto mb-4 text-[#8E857B]">
                  🧺
                </div>
                <h3 className="font-serif text-xl text-[#2B211D]">Your bag is currently empty</h3>
                <p className="text-xs text-[#8E857B] mt-2 mb-6">Explore our curated collection of master-woven sarees.</p>
                <Link
                  href="/sarees"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-block bg-[#641C2D] text-white px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition"
                >
                  Explore Sarees
                </Link>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-white rounded-lg border border-[#EDE3D5] shadow-xs">
                  <div className="relative w-20 h-24 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                    <img
                      src={`/${item.image}`}
                      alt={item.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif text-sm font-semibold text-[#2B211D] leading-snug line-clamp-1">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#8E857B] hover:text-red-600 transition"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#8E857B] mt-0.5">{item.sareeType} • {item.selectedColor}</p>
                      {item.blousePrice > 0 && (
                        <p className="text-[10px] text-[#B08D57] font-medium">+ {item.blouseOptionName} ({formatINR(item.blousePrice)})</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EDE3D5]/40">
                      <div className="flex items-center border border-[#EDE3D5] rounded-full px-2 py-0.5 bg-[#F8F5EF]">
                        <button
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="text-[#2B211D] hover:text-[#641C2D] p-1"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-2 text-[#2B211D]">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="text-[#2B211D] hover:text-[#641C2D] p-1"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#641C2D]">
                        {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="px-6 py-5 bg-white border-t border-[#EDE3D5] space-y-3">
              {coupon && (
                <div className="flex items-center justify-between text-xs bg-amber-50 text-amber-900 px-3 py-2 rounded border border-amber-200">
                  <span>Promo ({coupon.code}): -{formatINR(discountAmount)}</span>
                  <button onClick={removeCoupon} className="text-xs text-red-600 font-semibold underline">Remove</button>
                </div>
              )}
              <div className="space-y-1.5 text-xs text-[#6D625D]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#2B211D]">{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#641C2D]">
                    <span>Discount</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Insured Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : formatINR(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#2B211D] pt-2 border-t border-[#EDE3D5]">
                  <span>Total (incl. taxes)</span>
                  <span className="text-[#641C2D]">{formatINR(grandTotal)}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full bg-[#641C2D] hover:bg-[#4E1422] text-white py-3 rounded-full text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition shadow-md"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full text-center py-2 text-xs text-[#8E857B] hover:text-[#2B211D] font-medium uppercase tracking-wider"
                >
                  View Full Cart & Apply Coupons
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8E857B] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" /> Silk Mark Certified • 100% Genuine Sarees
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
