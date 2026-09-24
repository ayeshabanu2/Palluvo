'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { formatINR } from '@/data/products';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, closeQuickView, addToCart } = useShop();

  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedBlouse, setSelectedBlouse] = useState('unstitched');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (quickViewProduct) {
      document.body.classList.add('modal-open');
      setSelectedImg(0);
      setSelectedColor(quickViewProduct.color);
      setSelectedBlouse('unstitched');
      setQty(1);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const currentBlouseOption = quickViewProduct.blouseOptions?.find(b => b.id === selectedBlouse) || {
    id: 'unstitched',
    name: 'Unstitched Matching Fabric (0.8m Included)',
    price: 0
  };

  const unitTotal = quickViewProduct.price + currentBlouseOption.price;

  const handleAdd = () => {
    addToCart(quickViewProduct, qty, { color: selectedColor, blouseId: selectedBlouse });
    closeQuickView();
  };

  return (
    <div className="quickview-modal-wrap is-open" id="quickViewModal">
      <div className="quickview-backdrop" onClick={closeQuickView} />

      <div className="quickview-dialog" role="dialog" aria-modal="true" aria-label="Quick product view">
        <button
          type="button"
          className="quickview-close-btn"
          onClick={closeQuickView}
          aria-label="Close modal"
        >
          &times;
        </button>

        <div className="quickview-body">
          {/* Left Media Gallery */}
          <div className="quickview-gallery">
            <div className="quickview-main-image">
              <img
                src={quickViewProduct.images[selectedImg] || quickViewProduct.images[0]}
                alt={quickViewProduct.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                }}
              />
            </div>
            {quickViewProduct.images.length > 1 && (
              <div className="quickview-thumbs">
                {quickViewProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`quickview-thumb-btn ${selectedImg === idx ? 'is-active' : ''}`}
                    onClick={() => setSelectedImg(idx)}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Product Details */}
          <div className="quickview-info">
            <span className="quickview-eyebrow">
              {quickViewProduct.sareeType} &bull; {quickViewProduct.specifications?.origin || 'Handcrafted'}
            </span>
            <h2 className="quickview-title">{quickViewProduct.name}</h2>
            <p className="quickview-tagline">{quickViewProduct.tagline}</p>

            <div className="quickview-rating">
              ★ ★ ★ ★ ★ <span>{quickViewProduct.rating.toFixed(1)} ({quickViewProduct.reviewsCount} verified reviews)</span>
            </div>

            <div className="quickview-pricing">
              <span className="price-curr">{formatINR(unitTotal)}</span>
              {quickViewProduct.compareAtPrice && (
                <span className="price-orig">{formatINR(quickViewProduct.compareAtPrice)}</span>
              )}
              {quickViewProduct.discount && (
                <span className="price-discount">{quickViewProduct.discount}</span>
              )}
            </div>

            {/* Color Swatch Picker */}
            {quickViewProduct.swatches && quickViewProduct.swatches.length > 0 && (
              <div className="quickview-field">
                <label className="quickview-label">
                  COLOR: <strong>{selectedColor}</strong>
                </label>
                <div className="quickview-swatches">
                  {quickViewProduct.swatches.map((swatch, idx) => (
                    <button
                      key={swatch.name}
                      type="button"
                      className={`quickview-swatch ${selectedColor === swatch.name ? 'is-active' : ''}`}
                      style={{ backgroundColor: swatch.hex }}
                      onClick={() => {
                        setSelectedColor(swatch.name);
                        if (quickViewProduct.images[idx]) setSelectedImg(idx);
                      }}
                      title={swatch.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Blouse Option Picker */}
            {quickViewProduct.blouseOptions && quickViewProduct.blouseOptions.length > 0 && (
              <div className="quickview-field">
                <label className="quickview-label">BLOUSE TAILORING:</label>
                <div className="quickview-blouse-options">
                  {quickViewProduct.blouseOptions.map(b => (
                    <label key={b.id} className={`blouse-radio-item ${selectedBlouse === b.id ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="quickview_blouse"
                        value={b.id}
                        checked={selectedBlouse === b.id}
                        onChange={() => setSelectedBlouse(b.id)}
                      />
                      <span className="blouse-radio-text">
                        {b.name} {b.price > 0 ? `(+${formatINR(b.price)})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="quickview-actions">
              <div className="qty-control">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQty(prev => Math.max(1, prev - 1))}
                >
                  -
                </button>
                <span className="qty-val">{qty}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQty(prev => prev + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary quickview-add-cta"
                onClick={handleAdd}
              >
                ADD TO BAG &bull; {formatINR(unitTotal * qty)}
              </button>
            </div>

            <div className="quickview-full-link">
              <Link
                href={`/product/${quickViewProduct.slug}`}
                onClick={closeQuickView}
              >
                View Full Specifications & Weaver Story &rarr;
              </Link>
            </div>

            <div className="quickview-trust-tags">
              <span>✓ 100% Silk Mark Certified</span>
              <span>✓ 5.5m Saree + 0.8m Blouse</span>
              <span>✓ Free 7-Day Exchange</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
