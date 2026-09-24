'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/data/products';

export default function CartPage() {
  const {
    cart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartDiscount,
    cartShipping,
    cartTotal,
    coupon,
    applyCoupon,
    removeCoupon,
    freeShippingThreshold,
    freeShippingProgress
  } = useShop();

  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isGiftWrap, setIsGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState('');

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyCoupon(promoInput);
    setPromoMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      setPromoInput('');
    }
  };

  const amountNeeded = Math.max(0, freeShippingThreshold - cartSubtotal);

  if (cart.length === 0) {
    return (
      <div className="cart-page-empty">
        <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          <div className="empty-cart-icon" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛍️</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '1rem' }}>
            Your Shopping Bag is Empty
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            You haven&apos;t added any heirlooms yet. Explore our curated signature saree collections, woven with certified silk and tested real gold zari.
          </p>
          <Link href="/sarees" className="btn btn-primary">
            DISCOVER SIGNATURE SAREES &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        {/* Page Header */}
        <div className="cart-page-header">
          <h1 className="cart-page-title">Your Shopping Bag</h1>
          <span className="cart-items-counter">
            {cart.reduce((a, b) => a + b.qty, 0)} {cart.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Free Shipping Meter Banner */}
        <div className="cart-free-shipping-card">
          <div className="meter-text">
            {amountNeeded === 0 ? (
              <span className="text-unlocked">
                🎉 <strong>Complimentary Express Insured Shipping Unlocked!</strong>
              </span>
            ) : (
              <span>
                Add <strong>{formatINR(amountNeeded)}</strong> more to unlock <strong>Complimentary Express Shipping</strong>
              </span>
            )}
          </div>
          <div className="meter-track-cart">
            <div
              className="meter-bar-cart"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Main Grid: Items Table + Summary Sidebar */}
        <div className="cart-content-grid">
          {/* Items Column */}
          <div className="cart-items-column">
            <div className="cart-table-header">
              <span className="col-product">SAREE ITEM</span>
              <span className="col-price">PRICE</span>
              <span className="col-qty">QUANTITY</span>
              <span className="col-total">TOTAL</span>
            </div>

            <div className="cart-items-list">
              {cart.map(item => (
                <div key={item.cartItemId} className="cart-item-row">
                  <div className="cart-item-media">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                      }}
                    />
                  </div>

                  <div className="cart-item-info">
                    <Link href={`/product/${item.slug}`} className="cart-item-title">
                      {item.name}
                    </Link>
                    <div className="cart-item-meta">
                      <span className="meta-swatch">
                        <span className="dot" style={{ backgroundColor: item.colorHex }} />
                        {item.color}
                      </span>
                      {item.blouseName && (
                        <span className="meta-blouse">
                          Blouse: {item.blouseName} {item.blousePrice > 0 ? `(+${formatINR(item.blousePrice)})` : ''}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cart-remove-trigger"
                      onClick={() => removeFromCart(item.cartItemId)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="cart-item-unit-price">
                    {formatINR(item.unitTotal)}
                  </div>

                  <div className="cart-item-quantity">
                    <div className="qty-control">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateCartQty(item.cartItemId, -1)}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="qty-val">{item.qty}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateCartQty(item.cartItemId, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-line-total">
                    <span className="price-bold">{formatINR(item.unitTotal * item.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Gift Wrap Option */}
            <div className="cart-gift-box">
              <label className="gift-check-label">
                <input
                  type="checkbox"
                  checked={isGiftWrap}
                  onChange={(e) => setIsGiftWrap(e.target.checked)}
                />
                <span>
                  🎁 <strong>Complimentary Heritage Gift Packaging</strong> — Includes our handmade gold-embossed keepsake box, scented rose petals, and handwritten message.
                </span>
              </label>
              {isGiftWrap && (
                <div className="gift-note-field">
                  <textarea
                    placeholder="Enter your personal gift message for the recipient..."
                    rows={2}
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    className="gift-textarea"
                  />
                </div>
              )}
            </div>

            <div className="cart-actions-bar">
              <Link href="/sarees" className="continue-shopping-link">
                &larr; Continue Exploring Sarees
              </Link>
              <button
                type="button"
                className="clear-cart-link"
                onClick={clearCart}
              >
                Clear Entire Bag
              </button>
            </div>
          </div>

          {/* Summary Sidebar */}
          <aside className="cart-summary-column">
            <div className="cart-summary-card">
              <h3 className="summary-title">Order Summary</h3>

              {/* Coupon Form */}
              <div className="summary-coupon-section">
                {coupon ? (
                  <div className="applied-coupon-pill">
                    <div className="pill-text">
                      <strong>{coupon.code}</strong>
                      <span>-{formatINR(cartDiscount)} Saved</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="coupon-remove-btn">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="summary-coupon-form">
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. FESTIVE25)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="summary-coupon-input"
                    />
                    <button type="submit" className="summary-coupon-btn">
                      Apply
                    </button>
                  </form>
                )}
                {promoMessage && (
                  <div className={`summary-coupon-msg ${promoMessage.isError ? 'error' : 'success'}`}>
                    {promoMessage.text}
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="summary-breakdown">
                <div className="summary-row">
                  <span>Bag Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="summary-row discount-row">
                    <span>Coupon Discount</span>
                    <span>-{formatINR(cartDiscount)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Estimated Shipping</span>
                  <span>{cartShipping === 0 ? <strong className="text-free">FREE</strong> : formatINR(cartShipping)}</span>
                </div>
                <div className="summary-row total-row">
                  <span>Estimated Total</span>
                  <span className="total-amount">{formatINR(cartTotal)}</span>
                </div>
                <p className="summary-tax-note">Inclusive of GST, Fall &amp; Pico finishing, and insured delivery.</p>
              </div>

              {/* Checkout CTA */}
              <Link href="/checkout" className="btn btn-primary btn-block cart-checkout-btn">
                PROCEED TO CHECKOUT &rarr;
              </Link>

              {/* Trust badges */}
              <div className="summary-trust-badges">
                <div className="badge-row">
                  <span>🛡️</span>
                  <span>256-Bit SSL Encrypted Indian Payments</span>
                </div>
                <div className="badge-row">
                  <span>🎖️</span>
                  <span>100% Pure Silk Mark Certification Included</span>
                </div>
                <div className="badge-row">
                  <span>✈️</span>
                  <span>Insured Express Dispatch via Blue Dart Air</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
