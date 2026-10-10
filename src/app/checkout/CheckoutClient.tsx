'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { formatINR } from '@/utils/format';
import { ShieldCheck, Lock, CheckCircle2, ArrowLeft, Truck, CreditCard } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

type PaymentMethod = 'upi' | 'card' | 'cod';

export default function CheckoutClient({ userId }: { userId?: string }): React.JSX.Element {
  const { cart, grandTotal, subtotal, shippingFee, discountAmount, clearCart, showToast, recordOrder } = useStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});
  
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isSubmitted && confirmationRef.current) {
      confirmationRef.current.focus();
    }
  }, [isSubmitted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const errors: Partial<Record<keyof CheckoutFormData, string>> = {};
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.email) errors.email = "Email address is required";
    if (!formData.phone) errors.phone = "Mobile number is required";
    if (!formData.address) errors.address = "Street address is required";
    if (!formData.city) errors.city = "City is required";
    if (!formData.pincode) errors.pincode = "PIN code is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fill all mandatory shipping details.', 'error');
      
      const firstInvalidField = Object.keys(errors)[0];
      const element = document.getElementById(`checkout-${firstInvalidField}`);
      if (element) {
        element.focus();
      }
      return;
    }
    
    setFormErrors({});

    const generatedOrder = 'PLV-' + Math.floor(100000 + Math.random() * 900000);
    setOrderNumber(generatedOrder);

    // Persist order in StoreContext and localStorage
    recordOrder({
      orderNumber: generatedOrder,
      items: [...cart],
      subtotal,
      discountAmount,
      shippingFee,
      grandTotal,
      paymentMethod,
      customer: { ...formData },
      userId
    });

    // Also persist order to user-scoped Supabase orders table if authenticated
    if (userId) {
      try {
        const supabase = createClient();
        Promise.resolve(
          supabase
            .from('orders')
            .insert([
              {
                id: generatedOrder,
                order_number: generatedOrder,
                user_id: userId,
                items: [...cart],
                subtotal,
                discount_amount: discountAmount,
                shipping_fee: shippingFee,
                grand_total: grandTotal,
                payment_method: paymentMethod,
                customer: { ...formData },
                status: 'Confirmed'
              }
            ])
        )
          .then((res) => {
            if (res && 'error' in res && res.error) {
              console.warn('Supabase checkout order persistence notice:', res.error.message);
            }
          })
          .catch((err: unknown) => {
            console.warn('Supabase checkout order persistence error:', err);
          });
      } catch (e) {
        console.warn('Failed to initiate Supabase order persistence:', e);
      }
    }

    setIsSubmitted(true);
    clearCart();
    showToast(`Order ${generatedOrder} confirmed successfully!`);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" role="status" aria-live="polite">
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#EDE3D5] shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-[#641C2D] font-semibold">
            Order Confirmed
          </span>
          <h1 
            ref={confirmationRef}
            tabIndex={-1}
            className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D] mt-2 mb-2 focus:outline-none"
          >
            Every drape, a little magic.
          </h1>
          <p className="text-xs sm:text-sm text-[#6D625D] max-w-md mx-auto mb-6">
            Thank you, <strong className="text-[#2B211D]">{formData.firstName}</strong>. Your order <span className="font-mono text-[#641C2D] font-bold">#{orderNumber}</span> has been scheduled with master weavers for dispatch.
          </p>

          <div className="p-4 bg-[#F8F5EF] rounded-xl border border-[#EDE3D5] text-left text-xs space-y-2 mb-8">
            <div className="flex justify-between">
              <span className="text-[#665E57]">Confirmation Email sent to:</span>
              <span className="font-medium text-[#2B211D]">{formData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Shipping Destination:</span>
              <span className="font-medium text-[#2B211D]">{formData.city}, {formData.pincode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Estimated Insured Delivery:</span>
              <span className="font-medium text-emerald-800">2 to 4 Business Days</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/account"
              className="bg-[#641C2D] text-white px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition shadow-md"
            >
              View Order in Account
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
        <p className="text-xs text-[#665E57] mt-2 mb-6">Please add sarees to proceed to checkout.</p>
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
                  <label htmlFor="checkout-firstName" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    First Name *
                  </label>
                  <input
                    id="checkout-firstName"
                    type="text"
                    required
                    name="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    aria-invalid={formErrors.firstName ? "true" : "false"}
                    aria-describedby={formErrors.firstName ? "checkout-firstName-error" : undefined}
                    className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.firstName ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                  />
                  {formErrors.firstName && (
                    <p id="checkout-firstName-error" className="text-red-600 text-[10px] mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="checkout-lastName" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Last Name
                  </label>
                  <input
                    id="checkout-lastName"
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-email" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Email Address *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={formErrors.email ? "true" : "false"}
                    aria-describedby={formErrors.email ? "checkout-email-error" : undefined}
                    className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.email ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                  />
                  {formErrors.email && (
                    <p id="checkout-email-error" className="text-red-600 text-[10px] mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Mobile Number (For Courier Tracking) *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    inputMode="tel"
                    required
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    aria-invalid={formErrors.phone ? "true" : "false"}
                    aria-describedby={formErrors.phone ? "checkout-phone-error" : undefined}
                    className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.phone ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                  />
                  {formErrors.phone && (
                    <p id="checkout-phone-error" className="text-red-600 text-[10px] mt-1">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="checkout-address" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                  Street Address & Apartment / Villa *
                </label>
                <input
                  id="checkout-address"
                  type="text"
                  required
                  name="address"
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={handleChange}
                  aria-invalid={formErrors.address ? "true" : "false"}
                  aria-describedby={formErrors.address ? "checkout-address-error" : undefined}
                  className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.address ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                />
                {formErrors.address && (
                  <p id="checkout-address-error" className="text-red-600 text-[10px] mt-1">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="checkout-city" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    City *
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    required
                    name="city"
                    autoComplete="address-level2"
                    value={formData.city}
                    onChange={handleChange}
                    aria-invalid={formErrors.city ? "true" : "false"}
                    aria-describedby={formErrors.city ? "checkout-city-error" : undefined}
                    className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.city ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                  />
                  {formErrors.city && (
                    <p id="checkout-city-error" className="text-red-600 text-[10px] mt-1">{formErrors.city}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="checkout-state" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    State
                  </label>
                  <input
                    id="checkout-state"
                    type="text"
                    name="state"
                    autoComplete="address-level1"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-pincode" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    PIN Code *
                  </label>
                  <input
                    id="checkout-pincode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    name="pincode"
                    autoComplete="postal-code"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 560001"
                    aria-invalid={formErrors.pincode ? "true" : "false"}
                    aria-describedby={formErrors.pincode ? "checkout-pincode-error" : undefined}
                    className={`w-full bg-[#F8F5EF] border rounded-lg p-2.5 text-xs text-[#2B211D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${formErrors.pincode ? 'border-red-500' : 'border-[#EDE3D5] focus:border-[#641C2D]'}`}
                  />
                  {formErrors.pincode && (
                    <p id="checkout-pincode-error" className="text-red-600 text-[10px] mt-1">{formErrors.pincode}</p>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
            <h2 className="font-serif text-2xl font-bold text-[#2B211D] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#B08D57]" /> Payment Method
            </h2>

            <div className="space-y-3" role="radiogroup" aria-label="Select Payment Method">
              <label htmlFor="checkout-payment-upi" className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'upi' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    id="checkout-payment-upi"
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'upi'}
                    onChange={() => setPaymentMethod('upi')}
                    className="accent-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                  <span>Instant UPI (Google Pay / PhonePe / Paytm / Any UPI ID)</span>
                </div>
                <span className="text-[11px] text-[#B08D57] font-bold">Fastest</span>
              </label>

              <label htmlFor="checkout-payment-card" className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'card' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    id="checkout-payment-card"
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="accent-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                  <span>Credit / Debit Card (Visa, MasterCard, RuPay, Amex)</span>
                </div>
                <span className="text-[11px] text-[#665E57]">256-Bit SSL</span>
              </label>

              <label htmlFor="checkout-payment-cod" className={`flex items-center justify-between p-4 rounded-xl border text-xs cursor-pointer transition ${
                paymentMethod === 'cod' ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]' : 'border-[#EDE3D5]'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    id="checkout-payment-cod"
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                  <span>Cash on Delivery (COD)</span>
                </div>
                <span className="text-[11px] text-[#665E57]">Pay at Doorstep</span>
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
                  <div className="relative w-12 h-14 bg-[#EDE3D5] rounded overflow-hidden flex-shrink-0">
                    <Image src={`/${item.image}`} alt={item.name} fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2B211D] line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-[#665E57]">Qty: <span className="tabular-nums">{item.qty}</span> • {item.selectedColor}</p>
                  </div>
                  <span className="font-bold text-[#641C2D] tabular-nums">
                    {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#EDE3D5] space-y-2 text-xs text-[#6D625D]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#641C2D]">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? <strong className="text-emerald-700">FREE</strong> : <span className="tabular-nums">{formatINR(shippingFee)}</span>}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#2B211D] pt-2 border-t border-[#EDE3D5]">
                <span>Payable Total</span>
                <span className="text-[#641C2D] tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              className="w-full bg-[#641C2D] hover:bg-[#4E1422] text-white py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl transition mt-4"
            >
              <Lock className="w-4 h-4" /> Place Order (<span className="tabular-nums">{formatINR(grandTotal)}</span>)
            </button>

            <div className="pt-2 text-center text-[11px] text-[#665E57] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" /> Bank-Grade 256-bit Encrypted Checkout
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
