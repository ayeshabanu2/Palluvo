'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { formatINR } from '@/utils/format';
import { ShieldCheck, Lock, CheckCircle2, ArrowLeft, Truck, CreditCard, Loader2 } from 'lucide-react';
import { placeVerifiedOrder } from './actions';
import { PlacedOrder } from '@/types';

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

type PaymentMethod = 'cod';

export default function CheckoutClient({ userId }: { userId?: string }): React.JSX.Element {
  const { cart, grandTotal, subtotal, shippingFee, discountAmount, coupon, clearCart, showToast, recordOrder } = useStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
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

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CheckoutFormData, string>> = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) errors.phone = "Mobile number is required";
    if (!formData.address.trim()) errors.address = "Street address is required";
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.pincode.trim()) errors.pincode = "PIN code is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Please fill all mandatory shipping details correctly.', 'error');
      const firstInvalidField = Object.keys(errors)[0];
      const element = document.getElementById(`checkout-${firstInvalidField}`);
      if (element) element.focus();
      return false;
    }

    setFormErrors({});
    return true;
  };

  const getCheckoutItems = () => {
    return cart.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      selectedColor: item.selectedColor,
      blouseOptionId: item.blouseOptionId,
      blouseOptionName: item.blouseOptionName,
    }));
  };

  const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const items = getCheckoutItems();

      // Submit order to server-verified action
      // Only clears cart and displays confirmation after durable database persistence succeeds
      const result = await placeVerifiedOrder({
        items,
        couponCode: coupon?.code,
        paymentMethod,
        customer: formData,
      });

      if (result.success && result.order) {
        recordOrder({
          ...result.order,
          userId,
        });
        setPlacedOrder(result.order);
        setIsSubmitted(true);
        clearCart();
        showToast(`Order #${result.order.orderNumber} placed & confirmed successfully!`);
      } else {
        showToast(result.error || 'Could not complete order. Please try again.', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Server error while processing your order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center" role="status" aria-live="polite">
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[#EDE3D5] shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-emerald-800">
            Order Confirmed & Saved
          </span>

          <h1 
            ref={confirmationRef}
            tabIndex={-1}
            className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D] mt-2 mb-2 focus:outline-none"
          >
            Every drape, a little magic.
          </h1>

          <p className="text-xs sm:text-sm text-[#6D625D] max-w-md mx-auto mb-6">
            Thank you, <strong className="text-[#2B211D]">{placedOrder.customer.firstName}</strong>. Your order <span className="font-mono text-[#641C2D] font-bold">#{placedOrder.orderNumber}</span> has been confirmed and stored securely for fulfillment.
          </p>

          <div className="p-4 bg-[#F8F5EF] rounded-xl border border-[#EDE3D5] text-left text-xs space-y-2 mb-8">
            <div className="flex justify-between">
              <span className="text-[#665E57]">Order Status:</span>
              <span className="font-bold text-emerald-800">
                {placedOrder.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Payment Method:</span>
              <span className="font-bold text-[#2B211D] uppercase">
                Cash on Delivery (Pay at Doorstep)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Verified Order Total:</span>
              <span className="font-bold text-[#641C2D] tabular-nums">{formatINR(placedOrder.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Updates sent to:</span>
              <span className="font-medium text-[#2B211D]">{placedOrder.customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Shipping Destination:</span>
              <span className="font-medium text-[#2B211D]">{placedOrder.customer.city}, {placedOrder.customer.pincode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#665E57]">Estimated Insured Delivery:</span>
              <span className="font-medium text-[#2B211D]">2 to 4 Business Days</span>
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
              {/* Cash on Delivery (Enabled) */}
              <label htmlFor="checkout-payment-cod" className="flex items-center justify-between p-4 rounded-xl border border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D] text-xs cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    id="checkout-payment-cod"
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                  <span>Cash on Delivery (COD — Direct Confirmation & Doorstep Settlement)</span>
                </div>
                <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Available</span>
              </label>

              {/* Instant UPI (Disabled until gateway integration) */}
              <div className="flex flex-col p-4 rounded-xl border border-[#EDE3D5] bg-[#F8F5EF]/60 opacity-60 text-xs cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      id="checkout-payment-upi"
                      type="radio"
                      name="payment"
                      disabled
                      className="cursor-not-allowed text-[#8E857B]"
                    />
                    <label htmlFor="checkout-payment-upi" className="text-[#6D625D] font-medium cursor-not-allowed">
                      Instant UPI (Google Pay, PhonePe, Paytm, BHIM)
                    </label>
                  </div>
                  <span className="text-[10px] text-[#6D625D] uppercase tracking-wider font-semibold bg-[#EDE3D5] px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-[#8E857B] mt-1.5 pl-7">
                  Online UPI gateway integration is in progress. Please select Cash on Delivery for instant order confirmation.
                </p>
              </div>

              {/* Credit/Debit Card (Disabled until gateway integration) */}
              <div className="flex flex-col p-4 rounded-xl border border-[#EDE3D5] bg-[#F8F5EF]/60 opacity-60 text-xs cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      id="checkout-payment-card"
                      type="radio"
                      name="payment"
                      disabled
                      className="cursor-not-allowed text-[#8E857B]"
                    />
                    <label htmlFor="checkout-payment-card" className="text-[#6D625D] font-medium cursor-not-allowed">
                      Credit / Debit Card (Visa, MasterCard, RuPay, Amex)
                    </label>
                  </div>
                  <span className="text-[10px] text-[#6D625D] uppercase tracking-wider font-semibold bg-[#EDE3D5] px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] text-[#8E857B] mt-1.5 pl-7">
                  Card gateway integration in progress. Please select Cash on Delivery for instant order confirmation.
                </p>
              </div>
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
                    <Image
                      src={item.image.startsWith('/') ? item.image : `/${item.image}`}
                      alt={item.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-[#2B211D] truncate">{item.name}</h4>
                    <p className="text-[#665E57] text-[11px] truncate">
                      {item.selectedColor ? `${item.selectedColor} • ` : ''}
                      {item.blouseOptionName || 'Unstitched Blouse'}
                    </p>
                    <p className="text-[#665E57] text-[11px]">Qty: {item.qty}</p>
                  </div>
                  <span className="font-semibold text-[#641C2D] tabular-nums">
                    {formatINR((item.price + (item.blousePrice || 0)) * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-[#EDE3D5] space-y-2 text-xs text-[#6D625D]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#641C2D]">
                  <span>Discount ({coupon?.code})</span>
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
              disabled={isSubmitting}
              className="w-full bg-[#641C2D] hover:bg-[#4E1422] disabled:opacity-50 text-white py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl transition mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Order & Saving...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Confirm Cash on Delivery ({formatINR(grandTotal)})
                </>
              )}
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
