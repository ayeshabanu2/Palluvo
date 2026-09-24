'use client';

import React from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { SAREE_PRODUCTS, formatINR } from '@/data/products';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useShop();

  const savedProducts = SAREE_PRODUCTS.filter(p => wishlist.includes(p.id));

  const handleMoveToBag = (product: typeof SAREE_PRODUCTS[0]) => {
    addToCart(product, 1);
    toggleWishlist(product.id);
  };

  if (savedProducts.length === 0) {
    return (
      <div className="wishlist-empty-page" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <div className="container">
          <div className="empty-heart-icon" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-gold)' }}>
            ♡
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', marginBottom: '1rem' }}>
            Your Wishlist is Empty
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            Save your favorite drapes as you explore our handloom collections. Click the heart icon on any saree to curate your dream trousseau.
          </p>
          <Link href="/sarees" className="btn btn-primary">
            EXPLORE SAREE ARCHIVE &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="container">
        <div className="wishlist-header">
          <h1 className="wishlist-title">Saved Sarees</h1>
          <span className="wishlist-counter">
            {savedProducts.length} {savedProducts.length === 1 ? 'drape saved' : 'drapes saved'}
          </span>
        </div>

        <div className="products-grid wishlist-grid">
          {savedProducts.map(product => (
            <div key={product.id} className="saree-card">
              <div className="saree-card-media">
                <Link href={`/product/${product.slug}`} className="saree-media-link">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="saree-card-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                    }}
                  />
                </Link>

                <button
                  type="button"
                  className="saree-wishlist-btn is-active"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Remove from wishlist"
                  title="Remove from wishlist"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
              </div>

              <div className="saree-card-info">
                <span className="saree-card-type">{product.sareeType} &bull; {product.fabric}</span>
                <Link href={`/product/${product.slug}`} className="saree-card-name">
                  {product.name}
                </Link>

                <div className="saree-card-pricing">
                  <span className="saree-price-current">{formatINR(product.price)}</span>
                  {product.compareAtPrice && (
                    <span className="saree-price-original">{formatINR(product.compareAtPrice)}</span>
                  )}
                </div>

                <div className="wishlist-action-btns">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => handleMoveToBag(product)}
                  >
                    MOVE TO BAG
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
