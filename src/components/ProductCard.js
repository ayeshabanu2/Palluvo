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
    <div className="group relative bg-white rounded-lg overflow-hidden border border-[#EDE3D5]/80 hover:border-[#B08D57] transition-all duration-300 hover:shadow-xl flex flex-col">
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
            <span className="bg-[#B08D57] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
              {product.discount}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#241F1D] hover:text-[#641C2D] hover:bg-white transition shadow-sm z-10"
          aria-label="Wishlist toggle"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#641C2D] text-[#641C2D]' : ''}`} />
        </button>

        {/* Quick Action Overlay (Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
          <button
            onClick={() => {
              addToCart(product.id);
              setIsCartOpen(true);
            }}
            className="flex-1 bg-white text-[#2B211D] hover:bg-[#641C2D] hover:text-white py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-md"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Quick Add
          </button>
          <button
            onClick={() => setQuickViewProduct(product)}
            className="w-9 h-9 rounded-full bg-white/90 text-[#2B211D] hover:bg-white flex items-center justify-center transition shadow-md"
            title="Quick view"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#8E857B] uppercase tracking-wider mb-1">
            <span>{product.sareeType || product.category}</span>
            <div className="flex items-center gap-1 text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{product.rating || '4.9'}</span>
            </div>
          </div>

          <Link href={`/product/${product.slug || product.id}`} className="block">
            <h3 className="font-serif text-base font-semibold text-[#2B211D] hover:text-[#641C2D] transition line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-[#6D625D] line-clamp-1 mt-1 font-sans">
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
                <span className="text-[10px] text-[#8E857B]">+{product.swatches.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-3 pt-3 border-t border-[#EDE3D5]/60 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-[#641C2D]">
              {formatINR(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-[#8E857B] line-through">
                {formatINR(product.compareAtPrice)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-emerald-800 font-medium">
            In Stock
          </span>
        </div>
      </div>
    </div>
  );
}
