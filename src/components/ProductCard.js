'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { Heart, ShoppingBag, Eye, Star, Sparkles } from 'lucide-react';
import { formatINR } from '@/utils/format';

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart, setIsCartOpen, setQuickViewProduct } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden border border-[#EDE3D5]/80 hover:border-[#B08D57] focus-within:border-[#B08D57] transition-all duration-300 hover:shadow-xl focus-within:shadow-xl flex flex-col">
      {/* Saree Image Container */}
      <div className="relative aspect-[3/4] bg-[#EDE3D5]/40 overflow-hidden">
        <Link href={`/product/${product.slug || product.id}`} className="block w-full h-full">
          <img
            src={`/${product.images && product.images[0] ? product.images[0] : 'images/hero_saree_art.jpg'}`}
            alt={product.name}
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.badge && (
            <span className="bg-[#641C2D] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
              {product.badge}
            </span>
          )}
          {product.discount && (
            <span className="bg-[#B08D57] text-[#1C1613] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
              {product.discount}
            </span>
          )}
        </div>

        {/* Wishlist Button - 44x44px touch target, product-specific label, and aria-pressed */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-2.5 right-2.5 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] hover:bg-white transition shadow-sm z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          title={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#641C2D] text-[#641C2D]' : ''}`} />
        </button>

        {/* Quick Action Overlay (Touch-visible, Keyboard focus-within & Desktop hover) */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-center gap-2 transition-transform duration-300 md:translate-y-full md:group-hover:translate-y-0 md:group-focus-within:translate-y-0 focus-within:translate-y-0 z-10">
          <button
            onClick={() => {
              addToCart(product.id);
              setIsCartOpen(true);
            }}
            className="flex-1 min-h-[44px] bg-white text-[#2B211D] hover:bg-[#641C2D] hover:text-white focus:bg-[#641C2D] focus:text-white py-2 px-3 rounded-full text-xs font-semibold tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Quick add ${product.name} to bag`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Quick Add
          </button>
          <button
            onClick={() => setQuickViewProduct(product)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/95 text-[#2B211D] hover:bg-[#641C2D] hover:text-white focus:bg-[#641C2D] focus:text-white flex items-center justify-center transition shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Quick view details for ${product.name}`}
            title={`Quick view details for ${product.name}`}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#665E57] uppercase tracking-wider mb-1">
            <span className="truncate pr-1.5">{product.sareeType || product.category}</span>
            {product.rating && (
              <div className="flex items-center gap-1 text-amber-600 font-semibold shrink-0">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{product.rating}</span>
                {product.reviewsCount && (
                  <span className="text-[#665E57] font-normal text-[10px]">
                    ({product.reviewsCount})
                  </span>
                )}
              </div>
            )}
          </div>

          <Link href={`/product/${product.slug || product.id}`} className="block">
            <h3 className="font-serif text-sm sm:text-base font-semibold text-[#2B211D] hover:text-[#641C2D] transition line-clamp-2 leading-snug min-h-[2.5rem] sm:min-h-[2.75rem]">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-[#6D625D] line-clamp-2 mt-1 font-sans leading-snug min-h-[2rem]">
            {product.tagline || product.fabric}
          </p>

          {/* Color Swatches */}
          {product.swatches && product.swatches.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {product.swatches.slice(0, 4).map((swatch, idx) => (
                <span
                  key={idx}
                  title={swatch.name}
                  className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs inline-block"
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
              {product.swatches.length > 4 && (
                <span className="text-[10px] text-[#665E57]">+{product.swatches.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-3 pt-2.5 sm:pt-3 border-t border-[#EDE3D5]/60 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2">
            <span className="text-sm sm:text-base font-bold text-[#641C2D] whitespace-nowrap">
              {formatINR(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-[11px] sm:text-xs text-[#665E57] line-through whitespace-nowrap">
                {formatINR(product.compareAtPrice)}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-800 font-medium whitespace-nowrap">
            In Stock
          </span>
        </div>
      </div>
    </div>
  );
}
