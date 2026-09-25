'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { formatINR } from '@/utils/format';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const {
    cart,
    updateCartQty,
    removeFromCart,
    subtotal,
    shippingFee,
    discountAmount,
    grandTotal,
    coupon,
    applyCouponCode,
    removeCoupon
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState(null);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponInput) return;
    const res = applyCouponCode(couponInput);
    setCouponMsg(res);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
          Your Curated Atelier
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
          Shopping Bag
        </h1>
        <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4" />
      </div>

      {cart.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#EDE3D5] flex items-center justify-center mx-auto mb-4 text-2xl">
            🧺
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2B211D]">Your shopping bag is empty</h2>
          <p className="text-xs text-[#8E857B] mt-2 mb-6">
            Adorn your wardrobe with India's finest handloom silks and artisanal drapes.
          </p>
          <Link
            href="/sarees"
            className="inline-block bg-[#641C2D] text-white px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition shadow-md"
          >
            Explore All Sarees
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Cart Table / Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 sm:p-6 rounded-xl border border-[#EDE3D5] shadow-xs flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-lg overflow-hidden bg-[#EDE3D5] flex-shrink-0">
                    <img src={`/${item.image}`} alt={item.name} className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#2B211D]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#8E857B] mt-0.5">
                      {item.sareeType} • Color: {item.selectedColor}
                    </p>
                    {item.blousePrice > 0 ? (
                      <p className="text-xs text-[#B08D57] font-medium mt-1">
                        + {item.blouseOptionName} ({formatINR(item.blousePrice)})
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#134E4A] mt-1 font-medium">
                        ✓ Unstitched 0.8m Matching Blouse Included
                      </p>
                    )}
                    <p className="text-xs font-bold text-[#641C2D] mt-2 sm:hidden">
                      {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  {/* Quantity Controller */}
                  <div className="flex items-center border border-[#EDE3D5] rounded-full px-3 py-1 bg-[#F8F5EF]">
                    <button
                      onClick={() => updateCartQty(item.id, item.qty - 1)}
                      className="text-[#2B211D] hover:text-[#641C2D] p-1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold px-3 text-[#2B211D]">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, item.qty + 1)}
                      className="text-[#2B211D] hover:text-[#641C2D] p-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="hidden sm:block text-right min-w-24">
                    <span className="text-base font-bold text-[#641C2D]">
                      {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-[#8E857B] hover:text-red-600 rounded-full hover:bg-red-50 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="p-4 bg-white rounded-xl border border-[#EDE3D5] flex items-center justify-between text-xs text-[#6D625D]">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B08D57]" /> Free insured doorstep delivery across India
              </span>
              <Link href="/sarees" className="font-semibold text-[#641C2D] underline">
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary Column */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#EDE3D5] shadow-xs space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#2B211D] pb-3 border-b border-[#EDE3D5]">
                Order Summary
              </h2>

              {/* Coupon Form */}
              <div>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Try: PALLUVO10"
                      className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg px-3 py-2 text-xs uppercase font-mono text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#2B211D] hover:bg-[#641C2D] text-white px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition"
                  >
                    Apply
                  </button>
                </form>
                {couponMsg && (
                  <p className={`text-[11px] mt-1.5 font-medium ${couponMsg.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    {couponMsg.message}
                  </p>
                )}
                {coupon && (
                  <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded text-xs">
                    <span>Applied: <strong>{coupon.code}</strong></span>
                    <button onClick={removeCoupon} className="text-red-600 font-semibold underline text-[11px]">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Line items */}
              <div className="space-y-2 text-xs text-[#6D625D] pt-2 border-t border-[#EDE3D5]">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span className="font-bold text-[#2B211D]">{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#641C2D] font-medium">
                    <span>Privilege Discount</span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Standard Insured Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : formatINR(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#2B211D] pt-3 border-t border-[#EDE3D5]">
                  <span>Total Amount</span>
                  <span className="text-[#641C2D]">{formatINR(grandTotal)}</span>
                </div>
                <p className="text-[10px] text-[#8E857B] text-right">Inclusive of all GST taxes</p>
              </div>

              <Link
                href="/checkout"
                className="w-full bg-[#641C2D] hover:bg-[#4E1422] text-white py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl transition"
              >
                Proceed to Secure Checkout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
