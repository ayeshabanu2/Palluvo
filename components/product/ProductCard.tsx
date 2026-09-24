'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SareeProduct, formatINR } from '@/data/products';
import { useShop } from '@/context/ShopContext';

interface ProductCardProps {
  product: SareeProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useShop();
  const [selectedColor, setSelectedColor] = useState(product.color);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const isFavorited = isInWishlist(product.id);

  const handleColorChange = (e: React.MouseEvent, colorName: string, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedColor(colorName);
    if (product.images[idx]) {
      setCurrentImgIndex(idx);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, { color: selectedColor });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const primaryImage = product.images[currentImgIndex] || product.images[0] || '/images/hero_saree_art.jpg';
  const secondaryImage = product.images[1] || primaryImage;

  return (
    <div className="saree-card">
      <div className="saree-card-media">
        <Link href={`/product/${product.slug}`} className="saree-media-link">
          <img
            src={primaryImage}
            alt={product.name}
            className="saree-card-img primary-img"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
            }}
          />
          {product.images.length > 1 && (
            <img
              src={secondaryImage}
              alt={`${product.name} alternative drape`}
              className="saree-card-img hover-img"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
              }}
            />
          )}
        </Link>

        {/* Badge */}
        {product.badge && (
          <span className="saree-card-badge">{product.badge}</span>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          className={`saree-wishlist-btn ${isFavorited ? 'is-active' : ''}`}
          onClick={handleWishlist}
          aria-label={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Quick View Button */}
        <button
          type="button"
          className="saree-quickview-btn"
          onClick={handleQuickView}
        >
          QUICK VIEW
        </button>
      </div>

      <div className="saree-card-info">
        {/* Color Swatches */}
        {product.swatches && product.swatches.length > 0 && (
          <div className="saree-card-swatches">
            {product.swatches.map((swatch, idx) => (
              <button
                key={swatch.name}
                type="button"
                className={`saree-swatch-dot ${selectedColor === swatch.name ? 'is-active' : ''}`}
                style={{ backgroundColor: swatch.hex }}
                onClick={(e) => handleColorChange(e, swatch.name, idx)}
                title={swatch.name}
                aria-label={`Select color ${swatch.name}`}
              />
            ))}
          </div>
        )}

        <span className="saree-card-type">{product.sareeType} &bull; {product.fabric}</span>

        <Link href={`/product/${product.slug}`} className="saree-card-name">
          {product.name}
        </Link>

        <div className="saree-card-rating">
          ★ ★ ★ ★ ★ <span>{product.rating.toFixed(1)} ({product.reviewsCount})</span>
        </div>

        <div className="saree-card-pricing">
          <span className="saree-price-current">{formatINR(product.price)}</span>
          {product.compareAtPrice && (
            <span className="saree-price-original">{formatINR(product.compareAtPrice)}</span>
          )}
          {product.discount && (
            <span className="saree-price-off">{product.discount}</span>
          )}
        </div>

        <button
          type="button"
          className="saree-add-btn"
          onClick={handleAddToCart}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          ADD TO BAG
        </button>
      </div>
    </div>
  );
};
