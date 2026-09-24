'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/data/products';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartSubtotal, cartDiscount, cartShipping, cartTotal, placeOrder } = useShop();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    state: 'Telangana',
    pincode: ''
  });

  const [shippingSpeed, setShippingSpeed] = useState('express');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.pincode.trim()) {
      setErrorMsg('Please complete all mandatory shipping details (Name, Phone, Address, Pincode).');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Your shopping bag is empty.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    // Simulate payment authorization
    setTimeout(() => {
      const order = placeOrder({
        items: cart,
        subtotal: cartSubtotal,
        discount: cartDiscount,
        shipping: cartShipping,
        total: cartTotal,
        shippingDetails: formData,
        paymentMethod: paymentMethod.toUpperCase()
      });

      setIsProcessing(false);
      router.push(`/account?orderPlaced=${order.id}`);
    }, 1200);
  };

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginBottom: '1rem' }}>
          No Items to Checkout
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Your shopping bag is currently empty.
        </p>
        <Link href="/sarees" className="btn btn-primary">
          EXPLORE SAREE COLLECTIONS &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        {/* Checkout Header */}
        <div className="checkout-page-header">
          <Link href="/cart" className="checkout-back-link">
            &larr; Back to Shopping Bag
          </Link>
          <h1 className="checkout-title">Secure Indian Checkout</h1>
          <div className="checkout-ssl-badge">
            <span>🔒 256-Bit SSL Encrypted &amp; Insured</span>
          </div>
        </div>

        {errorMsg && (
          <div className="checkout-error-banner" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#FFF1F2', border: '1px solid #FDA4AF', color: '#9F1239', borderRadius: '4px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="checkout-layout-grid">
          {/* Left Column: Delivery & Payment Details */}
          <div className="checkout-form-column">
            
            {/* 1. Contact & Delivery Details */}
            <div className="checkout-card">
              <div className="card-header">
                <span className="step-num">1</span>
                <h3>Delivery Address</h3>
              </div>

              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="e.g. Ananya Rao"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>Mobile Number (For Courier Updates) *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>Email Address (For Tax Invoice &amp; Silk Mark Certificate) *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="e.g. ananya@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field full-width">
                  <label>Street Address / Apartment / Villa *</label>
                  <input
                    type="text"
                    name="address"
                    required
                    placeholder="House/Flat No, Apartment/Society Name, Road"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>Landmark (Optional)</label>
                  <input
                    type="text"
                    name="landmark"
                    placeholder="Near Temple / Metro Pillar"
                    value={formData.landmark}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="e.g. Hyderabad"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>State *</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                  >
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Other">Other Indian State</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Postal Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    maxLength={6}
                    placeholder="e.g. 500081"
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Speed */}
            <div className="checkout-card">
              <div className="card-header">
                <span className="step-num">2</span>
                <h3>Shipping &amp; Delivery Priority</h3>
              </div>

              <div className="shipping-options-list">
                <label className={`shipping-radio-item ${shippingSpeed === 'express' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping_speed"
                    value="express"
                    checked={shippingSpeed === 'express'}
                    onChange={() => setShippingSpeed('express')}
                  />
                  <div className="shipping-radio-info">
                    <strong>Blue Dart Express Insured Air Delivery</strong>
                    <span>Dispatched in 24 hours. Delivery in 2–4 business days with live SMS tracking.</span>
                  </div>
                  <span className="shipping-price-pill">
                    {cartShipping === 0 ? 'FREE' : formatINR(cartShipping)}
                  </span>
                </label>

                <label className={`shipping-radio-item ${shippingSpeed === 'concierge' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping_speed"
                    value="concierge"
                    checked={shippingSpeed === 'concierge'}
                    onChange={() => setShippingSpeed('concierge')}
                  />
                  <div className="shipping-radio-info">
                    <strong>PALLUVO White-Glove Concierge (Hyderabad / Hitech City)</strong>
                    <span>Hand-delivered in luxury wooden chest within 12 hours with certified draping masterclass.</span>
                  </div>
                  <span className="shipping-price-pill">COMPLIMENTARY</span>
                </label>
              </div>
            </div>

            {/* 3. Payment Methods */}
            <div className="checkout-card">
              <div className="card-header">
                <span className="step-num">3</span>
                <h3>Payment Method</h3>
              </div>

              <div className="payment-tabs-bar">
                <button
                  type="button"
                  className={`pay-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  📱 UPI / QR Code
                </button>
                <button
                  type="button"
                  className={`pay-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  💳 Credit / Debit Card
                </button>
                <button
                  type="button"
                  className={`pay-tab ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('netbanking')}
                >
                  🏦 NetBanking
                </button>
                <button
                  type="button"
                  className={`pay-tab ${paymentMethod === 'cod' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  💵 Cash on Delivery
                </button>
              </div>

              {/* UPI Tab */}
              {paymentMethod === 'upi' && (
                <div className="pay-tab-content">
                  <div className="upi-app-options">
                    <span className="app-badge">Google Pay</span>
                    <span className="app-badge">PhonePe</span>
                    <span className="app-badge">Paytm</span>
                    <span className="app-badge">BHIM UPI</span>
                  </div>
                  <div className="upi-input-group" style={{ marginTop: '1rem' }}>
                    <label>Enter your UPI VPA ID (e.g. mobile@upi or username@okhdfcbank):</label>
                    <input
                      type="text"
                      placeholder="yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <p className="payment-hint">
                    🔒 An instant payment request notification will be sent directly to your UPI app for 1-click authorization.
                  </p>
                </div>
              )}

              {/* Card Tab */}
              {paymentMethod === 'card' && (
                <div className="pay-tab-content">
                  <div className="form-grid">
                    <div className="form-field full-width">
                      <label>Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 •••• •••• 8912"
                        maxLength={19}
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>Valid Through (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardData.expiry}
                        onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Name on Card</label>
                      <input
                        type="text"
                        placeholder="Name as printed on card"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* NetBanking Tab */}
              {paymentMethod === 'netbanking' && (
                <div className="pay-tab-content">
                  <label>Select Your Bank:</label>
                  <div className="popular-banks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginTop: '0.5rem' }}>
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map(bank => (
                      <button key={bank} type="button" className="bank-select-btn" style={{ padding: '0.8rem', border: '1px solid var(--border-subtle)', background: 'white', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* COD Tab */}
              {paymentMethod === 'cod' && (
                <div className="pay-tab-content">
                  <div className="cod-alert" style={{ padding: '1rem', background: '#F8F5EF', border: '1px solid var(--color-gold)', borderRadius: '4px' }}>
                    <p><strong>Cash on Delivery (COD) Available:</strong> Pay cash or scan QR upon doorstep delivery via Blue Dart. Our dispatch concierge will call to reconfirm before handloom dispatch.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary btn-block place-order-btn"
              style={{ padding: '1.2rem', fontSize: '1.1rem', letterSpacing: '0.08em', marginTop: '1rem' }}
            >
              {isProcessing ? 'AUTHORIZING SECURE PAYMENT...' : `CONFIRM & PAY ${formatINR(cartTotal)}`}
            </button>
          </div>

          {/* Right Column: Order Summary */}
          <aside className="checkout-summary-column">
            <div className="checkout-summary-card">
              <h3 className="summary-title">Trousseau Summary</h3>
              
              <div className="checkout-items-list">
                {cart.map(item => (
                  <div key={item.cartItemId} className="checkout-item-preview">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                      }}
                    />
                    <div className="checkout-item-text">
                      <h4>{item.name}</h4>
                      <p>{item.color} &bull; Qty: {item.qty}</p>
                      {item.blouseName && <small>Blouse: {item.blouseName}</small>}
                    </div>
                    <div className="checkout-item-price">
                      {formatINR(item.unitTotal * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-calc-rows">
                <div className="calc-row">
                  <span>Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="calc-row discount">
                    <span>Discount</span>
                    <span>-{formatINR(cartDiscount)}</span>
                  </div>
                )}
                <div className="calc-row">
                  <span>Shipping</span>
                  <span>{cartShipping === 0 ? <strong className="text-free">FREE</strong> : formatINR(cartShipping)}</span>
                </div>
                <div className="calc-row grand-total">
                  <span>Total Payable</span>
                  <span className="total-num">{formatINR(cartTotal)}</span>
                </div>
              </div>

              <div className="checkout-guarantees">
                <p>🏺 100% Handloom Trust &amp; Pure Silk Mark Guarantee</p>
                <p>📦 Insured Dispatch with Blue Dart Air</p>
                <p>🔄 7-Day Easy Doorstep Pickup &amp; Exchange</p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
