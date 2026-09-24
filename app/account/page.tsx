'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useShop, Order } from '@/context/ShopContext';
import { formatINR } from '@/data/products';

function AccountContent() {
  const searchParams = useSearchParams();
  const orderPlacedId = searchParams.get('orderPlaced');
  const { orders } = useShop();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'preferences'>('orders');

  // Seed with sample initial order if none placed yet
  const sampleOrder: Order = {
    id: 'PAL-982144',
    date: '22 Sep 2026',
    status: 'Dispatched',
    trackingNumber: 'BLUEDART-IN49817293',
    subtotal: 7499,
    discount: 750,
    shipping: 0,
    total: 6749,
    shippingDetails: {
      fullName: 'Dr. Ananya Rao',
      phone: '+91 98765 43210',
      email: 'ananya.rao@example.com',
      address: 'Villa 14, Rainbow Vistas, Green Glen Layout, HSR Sector 2',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560102'
    },
    paymentMethod: 'UPI (GPAY)',
    items: [
      {
        cartItemId: 'sample-kanjivaram',
        productId: 'saree-002',
        name: 'Classic Kanjivaram Silk Saree',
        slug: 'classic-kanjivaram-silk-saree',
        image: '/images/categories/kanjivaram.jpg',
        price: 7499,
        color: 'Emerald Green',
        colorHex: '#1C3B2E',
        blouseName: 'Unstitched Matching Fabric (0.8m Included)',
        blousePrice: 0,
        blouseId: 'unstitched',
        unitTotal: 7499,
        qty: 1
      }
    ]
  };

  const displayOrders = orders.length > 0 ? orders : [sampleOrder];

  return (
    <div className="account-page">
      <div className="container">
        {orderPlacedId && (
          <div className="order-success-banner" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '4px' }}>
            <h3 style={{ color: '#166534', fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              🎉 Namaste! Your Order #{orderPlacedId} has been Confirmed
            </h3>
            <p style={{ color: '#15803D', lineHeight: 1.6 }}>
              Your handloom saree is being prepared by our master weavers for Silk Mark quality inspection. You can track your Blue Dart Air dispatch progress below.
            </p>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="account-profile-header">
          <div className="profile-avatar-wrap">
            <span className="avatar-initials">AR</span>
          </div>
          <div className="profile-text-wrap">
            <h1 className="profile-name">Ananya Rao</h1>
            <p className="profile-tier">
              🎖️ <strong>PALLUVO Saree Circle Member</strong> &bull; Bengaluru, India
            </p>
          </div>
          <div className="profile-quick-actions">
            <a href="https://wa.me/918498854323" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              💬 Stylist Concierge
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="account-nav-tabs">
          <button
            type="button"
            className={`account-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 My Orders &amp; Live Tracking ({displayOrders.length})
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            📍 Saved Addresses
          </button>
          <button
            type="button"
            className={`account-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            ✨ Styling &amp; Draping Preferences
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div className="account-tab-content">
            <div className="orders-stack">
              {displayOrders.map(order => (
                <div key={order.id} className="order-history-card">
                  <div className="order-history-header">
                    <div>
                      <span className="order-id-label">ORDER ID:</span>
                      <strong className="order-id-val">#{order.id}</strong>
                      <span className="order-date-text">&bull; Placed on {order.date}</span>
                    </div>
                    <div>
                      <span className="order-total-val">{formatINR(order.total)}</span>
                      <span className="order-payment-method">&bull; {order.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <div className="order-timeline-card">
                    <h4 className="timeline-title">
                      Live Courier Status: <strong>{order.status}</strong>
                    </h4>
                    <p className="tracking-number-text">
                      Blue Dart Air Waybill: <strong>{order.trackingNumber}</strong>
                    </p>

                    <div className="timeline-stepper">
                      <div className="step-point completed">
                        <span className="dot">✓</span>
                        <span className="step-label">Order Confirmed</span>
                      </div>
                      <div className={`step-point ${order.status !== 'Confirmed' ? 'completed' : 'active'}`}>
                        <span className="dot">{order.status !== 'Confirmed' ? '✓' : '2'}</span>
                        <span className="step-label">Handloom QC &amp; Silk Mark</span>
                      </div>
                      <div className={`step-point ${order.status === 'Dispatched' || order.status === 'Delivered' ? 'completed' : ''}`}>
                        <span className="dot">{order.status === 'Dispatched' || order.status === 'Delivered' ? '✓' : '3'}</span>
                        <span className="step-label">Keepsake Packaging</span>
                      </div>
                      <div className={`step-point ${order.status === 'Dispatched' || order.status === 'Delivered' ? 'active' : ''}`}>
                        <span className="dot">{order.status === 'Delivered' ? '✓' : '4'}</span>
                        <span className="step-label">Dispatched (Blue Dart Air)</span>
                      </div>
                      <div className={`step-point ${order.status === 'Delivered' ? 'completed' : ''}`}>
                        <span className="dot">5</span>
                        <span className="step-label">Delivered</span>
                      </div>
                    </div>
                  </div>

                  {/* Items in this order */}
                  <div className="order-items-grid">
                    {order.items.map(item => (
                      <div key={item.cartItemId} className="order-item-tile">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                          }}
                        />
                        <div className="order-item-info">
                          <h5>{item.name}</h5>
                          <p>{item.color} &bull; Qty: {item.qty}</p>
                          {item.blouseName && <small>Blouse: {item.blouseName}</small>}
                          <span className="price">{formatINR(item.unitTotal * item.qty)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery address footer */}
                  <div className="order-address-footer">
                    <p>
                      <strong>Delivering to:</strong> {order.shippingDetails.fullName}, {order.shippingDetails.address}, {order.shippingDetails.city}, {order.shippingDetails.state} - {order.shippingDetails.pincode}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Saved Addresses */}
        {activeTab === 'addresses' && (
          <div className="account-tab-content">
            <div className="addresses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div className="address-card" style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                <span className="address-tag" style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: 'var(--color-gold-soft)', color: 'var(--color-gold-hover)', fontSize: '0.75rem', fontWeight: 600, borderRadius: '2px', marginBottom: '0.8rem' }}>
                  DEFAULT RESIDENCE
                </span>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Ananya Rao</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  Villa 14, Rainbow Vistas, Green Glen Layout, HSR Sector 2<br />
                  Bengaluru, Karnataka - 560102<br />
                  Phone: +91 98765 43210
                </p>
              </div>

              <div className="address-card" style={{ padding: '1.5rem', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                <span className="address-tag" style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: '#F3F4F6', color: '#4B5563', fontSize: '0.75rem', fontWeight: 600, borderRadius: '2px', marginBottom: '0.8rem' }}>
                  PARENTAL HOME (HYDERABAD)
                </span>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Ananya Rao</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  Flat 402, Sai Heritage, Kavuri Hills Road, Madhapur<br />
                  Hyderabad, Telangana - 500081<br />
                  Phone: +91 84988 54323
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Preferences */}
        {activeTab === 'preferences' && (
          <div className="account-tab-content">
            <div className="preferences-card" style={{ padding: '2rem', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '4px', maxWidth: '640px' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                Your Saree Profile
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                These measurements and drape preferences allow our master ateliers to tailor your complimentary blouse pieces with precision.
              </p>
              <div className="preferences-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div><strong>Preferred Weave:</strong> Kanjivaram Temple Silk &amp; Pure Banarasi</div>
                <div><strong>Standard Height:</strong> 5&apos;6&quot; (Standard 5.5m drape)</div>
                <div><strong>Blouse Style:</strong> Classic Elbow Length Sleeve with Deep U-Neck</div>
                <div><strong>Zari Finish:</strong> Antique Matte Gold</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="loading-container">Loading PALLUVO Account...</div>}>
      <AccountContent />
    </Suspense>
  );
}
