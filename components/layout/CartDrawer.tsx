'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/data/products';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartDrawerOpen,
    closeCartDrawer,
    updateCartQty,
    removeFromCart,
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

  useEffect(() => {
    if (isCartDrawerOpen) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }
    return () => document.body.classList.remove('drawer-open');
  }, [isCartDrawerOpen]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyCoupon(promoInput);
    setPromoMessage({ text: res.message, isError: !res.success });
    if (res.success) {
      setPromoInput('');
    }
  };

  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  return (
    <div className={`cart-drawer-wrap ${isCartDrawerOpen ? 'is-open' : ''}`} id="cartDrawerWrap">
      <div className="cart-drawer-backdrop" onClick={closeCartDrawer} />

      <aside className="cart-drawer" id="cartDrawer" aria-label="Shopping Bag Drawer">
        {/* Header */}
        <div className="cart-drawer-head">
          <div className="drawer-title-wrap">
            <h3 className="cart-drawer-title">Shopping Bag</h3>
            <span className="cart-drawer-count">({cart.reduce((a, b) => a + b.qty, 0)})</span>
          </div>
          <button
            type="button"
            className="cart-drawer-close"
            onClick={closeCartDrawer}
            aria-label="Close bag"
          >
            &times;
          </button>
        </div>

        {/* Free Shipping Meter */}
        <div className="drawer-shipping-meter">
          <div className="meter-label">
            {amountNeededForFreeShipping === 0 ? (
              <span className="meter-success">🎉 Congratulations! You have unlocked Complimentary Express Shipping.</span>
            ) : (
              <span>Add <strong>{formatINR(amountNeededForFreeShipping)}</strong> more for <strong>Complimentary Express Shipping</strong></span>
            )}
          </div>
          <div className="meter-track">
            <div
              className="meter-bar"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="empty-icon">🛍️</div>
              <h4>Your Shopping Bag is Empty</h4>
              <p>Explore our curated signature saree drapes and find your perfect heirloom.</p>
              <Link href="/sarees" className="btn btn-primary" onClick={closeCartDrawer}>
                EXPLORE SAREES
              </Link>
            </div>
          ) : (
            <div className="drawer-items-list">
              {cart.map(item => (
                <div key={item.cartItemId} className="drawer-item">
                  <div className="drawer-item-thumb">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                      }}
                    />
                  </div>

                  <div className="drawer-item-details">
                    <div className="drawer-item-top">
                      <Link
                        href={`/product/${item.slug}`}
                        className="drawer-item-name"
                        onClick={closeCartDrawer}
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        className="drawer-item-remove"
                        onClick={() => removeFromCart(item.cartItemId)}
                        aria-label="Remove item"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="drawer-item-options">
                      <span className="drawer-option-chip">
                        <span
                          className="drawer-color-dot"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        {item.color}
                      </span>
                      {item.blouseName && (
                        <span className="drawer-blouse-note">
                          Blouse: {item.blouseName} {item.blousePrice > 0 ? `(+${formatINR(item.blousePrice)})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="drawer-item-bottom">
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

                      <div className="drawer-item-pricing">
                        <span className="drawer-price-current">
                          {formatINR(item.unitTotal * item.qty)}
                        </span>
                        {item.compareAtPrice && (
                          <span className="drawer-price-compare">
                            {formatINR(item.compareAtPrice * item.qty)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer with Coupon & Checkout */}
        {cart.length > 0 && (
          <div className="cart-drawer-foot">
            {/* Promo Code Form */}
            <div className="drawer-coupon-wrap">
              {coupon ? (
                <div className="applied-coupon-pill">
                  <div className="coupon-pill-info">
                    <span className="coupon-code-badge">{coupon.code}</span>
                    <span className="coupon-desc-text">-{formatINR(cartDiscount)} off</span>
                  </div>
                  <button
                    type="button"
                    className="coupon-remove-btn"
                    onClick={removeCoupon}
                    aria-label="Remove coupon"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="drawer-coupon-form">
                  <input
                    type="text"
                    placeholder="Enter coupon (e.g. FESTIVE25)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="drawer-coupon-input"
                  />
                  <button type="submit" className="drawer-coupon-btn">
                    Apply
                  </button>
                </form>
              )}
              {promoMessage && (
                <div className={`drawer-coupon-msg ${promoMessage.isError ? 'error' : 'success'}`}>
                  {promoMessage.text}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="drawer-totals">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatINR(cartSubtotal)}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="totals-row discount-row">
                  <span>Promotion Discount</span>
                  <span>-{formatINR(cartDiscount)}</span>
                </div>
              )}
              <div className="totals-row">
                <span>Estimated Shipping</span>
                <span>{cartShipping === 0 ? <strong className="text-free">FREE</strong> : formatINR(cartShipping)}</span>
              </div>
              <div className="totals-row total-grand">
                <span>Estimated Total</span>
                <span className="grand-val">{formatINR(cartTotal)}</span>
              </div>
              <p className="tax-notice">Includes GST & All Applicable Indian Handloom Duties</p>
            </div>

            {/* CTA Buttons */}
            <div className="drawer-actions">
              <Link
                href="/checkout"
                className="btn btn-primary btn-block checkout-cta"
                onClick={closeCartDrawer}
              >
                PROCEED TO CHECKOUT &rarr;
              </Link>
              <Link
                href="/cart"
                className="btn btn-secondary btn-block view-bag-cta"
                onClick={closeCartDrawer}
              >
                VIEW FULL BAG
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
