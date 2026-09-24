'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getProductBySlugOrId,
  SAREE_PRODUCTS,
  formatINR,
  SareeProduct
} from '@/data/products';
import { useShop } from '@/context/ShopContext';
import { ProductCard } from '@/components/product/ProductCard';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const product: SareeProduct | undefined = getProductBySlugOrId(slug);

  const { addToCart, toggleWishlist, isInWishlist } = useShop();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.color || '');
  const [selectedBlouse, setSelectedBlouse] = useState('unstitched');
  const [qty, setQty] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<{ checked: boolean; valid: boolean; text: string } | null>(null);

  // Accordion open states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    specs: true,
    story: false,
    draping: false,
    shipping: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!product) {
    return (
      <div className="container not-found-container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '1rem' }}>
          Saree Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The requested heirloom drape could not be located in our atelier catalog.
        </p>
        <Link href="/sarees" className="btn btn-primary">
          BROWSE ALL SAREES &rarr;
        </Link>
      </div>
    );
  }

  const isFavorited = isInWishlist(product.id);

  const currentBlouseOption = product.blouseOptions?.find(b => b.id === selectedBlouse) || {
    id: 'unstitched',
    name: 'Unstitched Matching Fabric (0.8m Included)',
    price: 0
  };

  const unitTotal = product.price + currentBlouseOption.price;

  const handleAddToCart = () => {
    addToCart(product, qty, { color: selectedColor, blouseId: selectedBlouse });
  };

  const handleBuyNow = () => {
    addToCart(product, qty, { color: selectedColor, blouseId: selectedBlouse });
    router.push('/checkout');
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim() || pincode.length !== 6 || isNaN(Number(pincode))) {
      setPincodeStatus({
        checked: true,
        valid: false,
        text: 'Please enter a valid 6-digit Indian Postal Pincode.'
      });
      return;
    }
    setPincodeStatus({
      checked: true,
      valid: true,
      text: `✓ Express Air Delivery available to ${pincode}! Expected dispatch within 24 hours. Delivery in 2–4 business days.`
    });
  };

  // Related products from same category or occasion
  const relatedSarees = SAREE_PRODUCTS.filter(
    p => p.id !== product.id && (p.category === product.category || p.occasion === product.occasion)
  ).slice(0, 4);

  return (
    <div className="product-page">
      <div className="container">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="crumb-sep">/</span>
          <Link href="/sarees">Sarees</Link>
          <span className="crumb-sep">/</span>
          <Link href={`/sarees?category=${encodeURIComponent(product.category)}`}>
            {product.category}
          </Link>
          <span className="crumb-sep">/</span>
          <span className="crumb-active">{product.name}</span>
        </nav>

        {/* PDP Main 2-Col Layout */}
        <div className="pdp-layout-grid">
          {/* Left Media Showcase */}
          <div className="pdp-media-column">
            <div className="pdp-main-image-wrap">
              <img
                src={product.images[activeImgIndex] || product.images[0]}
                alt={product.name}
                className="pdp-main-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                }}
              />
              {product.badge && (
                <span className="pdp-badge-pill">{product.badge}</span>
              )}
              <button
                type="button"
                className={`pdp-wishlist-trigger ${isFavorited ? 'is-active' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>

            {/* Thumbnail Navigation */}
            {product.images.length > 1 && (
              <div className="pdp-thumbs-grid">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-thumb-tile ${activeImgIndex === idx ? 'is-active' : ''}`}
                    onClick={() => setActiveImgIndex(idx)}
                  >
                    <img
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Product Information */}
          <div className="pdp-details-column">
            <div className="pdp-header">
              <span className="pdp-eyebrow">
                {product.sareeType} &bull; {product.specifications?.origin || 'Handcrafted India'}
              </span>
              <h1 className="pdp-title">{product.name}</h1>
              <p className="pdp-tagline">{product.tagline}</p>

              <div className="pdp-rating-row">
                <div className="stars">★ ★ ★ ★ ★</div>
                <span className="rating-score">{product.rating.toFixed(1)}</span>
                <span className="review-count">({product.reviewsCount} verified reviews)</span>
                <span className="silk-mark-badge">🎖️ Silk Mark Certified</span>
              </div>

              <div className="pdp-price-row">
                <span className="pdp-price-current">{formatINR(unitTotal)}</span>
                {product.compareAtPrice && (
                  <span className="pdp-price-compare">{formatINR(product.compareAtPrice)}</span>
                )}
                {product.discount && (
                  <span className="pdp-price-discount">{product.discount}</span>
                )}
              </div>
              <p className="pdp-tax-note">Price inclusive of all taxes. Complimentary fall, pico &amp; tassels.</p>
            </div>

            {/* Color Swatches */}
            {product.swatches && product.swatches.length > 0 && (
              <div className="pdp-option-section">
                <label className="option-label">
                  COLOR: <strong>{selectedColor || product.color}</strong>
                </label>
                <div className="pdp-swatches-row">
                  {product.swatches.map((swatch, idx) => (
                    <button
                      key={swatch.name}
                      type="button"
                      className={`pdp-swatch-circle ${selectedColor === swatch.name ? 'is-active' : ''}`}
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => {
                        setSelectedColor(swatch.name);
                        if (product.images[idx]) setActiveImgIndex(idx);
                      }}
                      title={swatch.name}
                      aria-label={`Select color ${swatch.name}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Blouse Customization Option */}
            {product.blouseOptions && product.blouseOptions.length > 0 && (
              <div className="pdp-option-section">
                <div className="option-label-split">
                  <label className="option-label">BLOUSE CUSTOMIZATION &amp; STITCHING:</label>
                  <span className="blouse-specs-note">0.8m pure silk piece included</span>
                </div>
                <div className="pdp-blouse-options">
                  {product.blouseOptions.map(b => (
                    <label
                      key={b.id}
                      className={`blouse-choice-card ${selectedBlouse === b.id ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="blouse_selection"
                        value={b.id}
                        checked={selectedBlouse === b.id}
                        onChange={() => setSelectedBlouse(b.id)}
                      />
                      <div className="blouse-choice-details">
                        <span className="blouse-choice-name">{b.name}</span>
                        <span className="blouse-choice-price">
                          {b.price === 0 ? 'Included (₹0)' : `+${formatINR(b.price)}`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Action Buttons */}
            <div className="pdp-actions-row">
              <div className="qty-control">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQty(prev => Math.max(1, prev - 1))}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="qty-val">{qty}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQty(prev => prev + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary pdp-add-bag-btn"
                onClick={handleAddToCart}
              >
                ADD TO BAG &bull; {formatINR(unitTotal * qty)}
              </button>

              <button
                type="button"
                className="btn btn-secondary pdp-buy-now-btn"
                onClick={handleBuyNow}
              >
                BUY NOW
              </button>
            </div>

            {/* Pincode Estimator */}
            <div className="pdp-pincode-card">
              <span className="pincode-title">Estimated Delivery &amp; Pincode Check</span>
              <form onSubmit={handleCheckPincode} className="pincode-form">
                <input
                  type="text"
                  placeholder="Enter 6-digit Indian Pincode"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="pincode-input"
                />
                <button type="submit" className="pincode-check-btn">
                  Check
                </button>
              </form>
              {pincodeStatus && (
                <div className={`pincode-status ${pincodeStatus.valid ? 'success' : 'error'}`}>
                  {pincodeStatus.text}
                </div>
              )}
            </div>

            {/* Trust Highlights */}
            <div className="pdp-trust-highlights">
              <div className="trust-item">
                <span className="trust-icon">🏺</span>
                <span>Authentic Handloom Weave</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">📐</span>
                <span>5.5m Saree + 0.8m Blouse</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">✨</span>
                <span>Tested Real Gold Zari</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔄</span>
                <span>7-Day Easy Exchange</span>
              </div>
            </div>

            {/* Accordions */}
            <div className="pdp-accordions">
              {/* 1. Specifications */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-trigger"
                  onClick={() => toggleAccordion('specs')}
                >
                  <span>Saree Specifications &amp; Dimensions</span>
                  <span className="acc-icon">{openAccordions.specs ? '−' : '+'}</span>
                </button>
                {openAccordions.specs && (
                  <div className="pdp-accordion-body">
                    <table className="specs-table">
                      <tbody>
                        <tr>
                          <th>Total Saree Length</th>
                          <td>{product.specifications?.length || '5.5 meters'}</td>
                        </tr>
                        <tr>
                          <th>Width</th>
                          <td>{product.specifications?.width || '45 inches'}</td>
                        </tr>
                        <tr>
                          <th>Blouse Piece</th>
                          <td>{product.specifications?.blouseLength || '0.8 meter matching silk piece included'}</td>
                        </tr>
                        <tr>
                          <th>Weaving Technique</th>
                          <td>{product.specifications?.weave || 'Traditional Handloom'}</td>
                        </tr>
                        <tr>
                          <th>Cluster Origin</th>
                          <td>{product.specifications?.origin || 'India'}</td>
                        </tr>
                        <tr>
                          <th>Zari Composition</th>
                          <td>{product.specifications?.zariType || 'Tested Pure Gold Zari'}</td>
                        </tr>
                        <tr>
                          <th>Fall &amp; Pico Edging</th>
                          <td>{product.specifications?.fallPico || 'Complimentary edging finished by master craftsmen'}</td>
                        </tr>
                        <tr>
                          <th>Care Instructions</th>
                          <td>{product.specifications?.care || 'Strictly dry clean only. Store wrapped in breathable muslin.'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Weaver Story */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-trigger"
                  onClick={() => toggleAccordion('story')}
                >
                  <span>The Weaver Story &amp; Craftsmanship</span>
                  <span className="acc-icon">{openAccordions.story ? '−' : '+'}</span>
                </button>
                {openAccordions.story && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      {product.description}
                    </p>
                    <p style={{ marginTop: '0.8rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      Each thread represents unhurried craftsmanship on wooden pit looms, supporting master weaver families with fair living wages and preserving cultural heritage for future generations.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Draping Guide */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-trigger"
                  onClick={() => toggleAccordion('draping')}
                >
                  <span>Draping &amp; Styling Guide</span>
                  <span className="acc-icon">{openAccordions.draping ? '−' : '+'}</span>
                </button>
                {openAccordions.draping && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      <strong>Nivi Drape:</strong> Tuck into petticoat at the navel, wrap once around waist, create 5 to 7 graceful pleats, and drape the remaining opulent zari pallu over the left shoulder.
                    </p>
                    <p style={{ marginTop: '0.6rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      <strong>Stylist Tip:</strong> Pair with antique temple jewellery for wedding ceremonies, or minimalist pearl drop earrings and a sleek sleeveless blouse for contemporary evening cocktail receptions.
                    </p>
                  </div>
                )}
              </div>

              {/* 4. Shipping & Returns */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-trigger"
                  onClick={() => toggleAccordion('shipping')}
                >
                  <span>Insured Shipping &amp; 7-Day Exchange</span>
                  <span className="acc-icon">{openAccordions.shipping ? '−' : '+'}</span>
                </button>
                {openAccordions.shipping && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      • <strong>Express Delivery:</strong> Dispatched within 24 hours in tamper-evident luxury keepsake packaging with Blue Dart Air across India.
                    </p>
                    <p style={{ marginTop: '0.4rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      • <strong>Complimentary Shipping:</strong> Free express delivery on all orders above ₹2,999.
                    </p>
                    <p style={{ marginTop: '0.4rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      • <strong>Easy Returns &amp; Exchanges:</strong> 7-day doorstep pickup guarantee if unworn with original Silk Mark seal intact.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Sarees */}
        {relatedSarees.length > 0 && (
          <section className="pdp-related-section">
            <div className="section-head text-center">
              <span className="section-eyebrow">COMPLETE YOUR TROUSSEAU</span>
              <h2 className="section-title">You May Also Admire</h2>
            </div>
            <div className="products-grid">
              {relatedSarees.map(item => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
