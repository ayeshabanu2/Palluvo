'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import { formatINR } from '@/utils/format';
import { ShieldCheck, Lock, CheckCircle2, ArrowLeft, Truck, CreditCard } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, grandTotal, subtotal, shippingFee, discountAmount, clearCart, showToast } = useStore();

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.phone || !formData.address || !formData.pincode) {
      showToast('Please fill all mandatory shipping details.');
      return;
    }

    const generatedOrder = 'PLV-' + Math.floor(100000 + Math.random() * 900000);
    setOrderNumber(generatedOrder);
    setIsSubmitted(true);
    clearCart();
    showToast(`Order ${generatedOrder} confirmed successfully!`);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#EDE3D5] shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold">
            Order Confirmed
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D] mt-2 mb-2">
            Every drape, a little magic.
          </h1>
          <p className="text-xs sm:text-sm text-[#6D625D] max-w-md mx-auto mb-6">
            Thank you, <strong className="text-[#2B211D]">{formData.firstName}</strong>. Your order <span className="font-mono text-[#641C2D] font-bold">#{orderNumber}</span> has been scheduled with master weavers for dispatch.
          </p>

          <div className="p-4 bg-[#F8F5EF] rounded-xl border border-[#EDE3D5] text-left text-xs space-y-2 mb-8">
            <div className="flex justify-between">
              <span className="text-[#8E857B]">Confirmation Email sent to:</span>
              <span className="font-medium text-[#2B211D]">{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E857B]">Shipping Destination:</span>
              <span className="font-medium text-[#2B211D]">{formData.city}, {formData.pincode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E857B]">Estimated Insured Delivery:</span>
              <span className="font-medium text-emerald-800">2–4 Business Days</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="bg-[#641C2D] text-white px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition"
            >
              Return to Boutique Home
            </Link>
            <Link
              href="/sarees"
              className="bg-white border border-[#EDE3D5] text-[#2B211D] px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#F8F5EF] transition"
            >
              Explore More Sarees
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#2B211D]">Your Bag is Empty</h2>
        <p className="text-xs text-[#8E857B] mt-2 mb-6">Please add sarees to proceed to checkout.</p>
        <Link href="/sarees" className="bg-[#641C2D] text-white px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider">
          Browse Sarees
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cart" className="text-xs font-medium text-[#641C2D] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Bag
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Shipping Form & Payment Selection */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Shipping Address */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
            <h2 className="font-serif text-2xl font-bold text-[#2B211D] mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#B08D57]" /> Delivery Address
            </h2>

            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Mobile Number (For Courier Tracking) *
                  </label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                  Street Address & Apartment / Villa *
                </label>
                <input
                  type="text"
                  required
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
            <h2 className="font-serif text-2xl font-bold text-[#2B211D] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#B08D57]" /> Payment Method
            </h2>

            <div className="space-y-3">
              <label className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'upi' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                    className="accent-[#641C2D]"
                  />
                  <span>Instant UPI (Google Pay / PhonePe / Paytm / Any UPI ID)</span>
                </div>
                <span className="text-[11px] text-[#B08D57] font-bold">Fastest</span>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'card' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="accent-[#641C2D]"
                  />
                  <span>Credit / Debit Card (Visa, MasterCard, RuPay, Amex)</span>
                </div>
                <span className="text-[11px] text-[#8E857B]">256-Bit SSL</span>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'cod' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#641C2D]"
                  />
                  <span>Cash on Delivery (COD)</span>
                </div>
                <span className="text-[11px] text-[#8E857B]">Pay at Doorstep</span>
              </label>
            </div>
          </div>

        </div>

        {/* Order Review Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EDE3D5] shadow-xs space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#2B211D] pb-3 border-b border-[#EDE3D5]">
              Items In Order ({cart.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs items-center">
                  <div className="w-12 h-14 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                    <img src={`/${item.image}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2B211D] line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-[#8E857B]">Qty: {item.qty} • {item.selectedColor}</p>
                  </div>
                  <span className="font-bold text-[#641C2D]">
                    {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#EDE3D5] space-y-2 text-xs text-[#6D625D]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#641C2D]">
                  <span>Discount</span>
                  <span>-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : formatINR(shippingFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#2B211D] pt-2 border-t border-[#EDE3D5]">
                <span>Payable Total</span>
                <span className="text-[#641C2D]">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="w-full bg-[#641C2D] hover:bg-[#4E1422] text-white py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl transition mt-4"
            >
              <Lock className="w-4 h-4" /> Place Order ({formatINR(grandTotal)})
            </button>

            <div className="pt-2 text-center text-[11px] text-[#8E857B] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" /> Bank-Grade 256-bit Encrypted Checkout
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
