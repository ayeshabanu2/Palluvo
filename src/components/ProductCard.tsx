'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { Heart, Star } from 'lucide-react';
import { formatINR } from '@/utils/format';
import { ProductCardProps } from '@/types';

export default function ProductCard({ product }: ProductCardProps): React.JSX.Element {
  const { wishlist, toggleWishlist } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  // Format reviews count like '3k' or '101'
  const formatReviewsCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return count.toString();
  };

  return (
    <div className="group relative flex flex-col">
      {/* Saree Image Container */}
      <div className="relative aspect-[3/4] bg-[#f0f0f0] overflow-hidden rounded-lg">
        <Link href={`/product/${product.slug || product.id}`} className="block w-full h-full relative">
          <Image
            src={`/${product.images && product.images[0] ? product.images[0] : 'images/hero_saree_art.jpg'}`}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        
        {/* Wishlist Button - Top Right */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 w-8 h-8 min-w-[32px] min-h-[32px] rounded-full bg-white/95 flex items-center justify-center text-[#878787] hover:text-[#ff3f6c] shadow-sm z-10 transition-colors"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#ff3f6c] text-[#ff3f6c]' : ''}`} />
        </button>
        
        {/* Rating Badge - Bottom Left */}
        {product.rating && (
          <div className="absolute bottom-2 left-2 z-10 bg-white/95 px-1.5 py-0.5 rounded flex items-center gap-1 text-[11px] font-bold text-[#212121] shadow-sm">
            <span>{product.rating}</span>
            <Star className="w-2.5 h-2.5 fill-[#388e3c] text-[#388e3c]" />
            {product.reviewsCount && (
              <>
                <span className="text-[#e0e0e0] font-normal mx-0.5">|</span>
                <span className="text-[#878787] font-normal">{formatReviewsCount(product.reviewsCount)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="pt-2 px-1 flex-1 flex flex-col">
        <Link href={`/product/${product.slug || product.id}`} className="block">
          <h3 className="font-bold text-[13px] sm:text-sm text-[#212121] truncate">
            {product.sareeType || product.category || 'Palluvo Signature'}
          </h3>

        </Link>

        <div className="mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
          {product.discount && (
            <span className="text-[#388e3c] text-[11px] sm:text-xs font-bold">
              ↓{product.discount}
            </span>
          )}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[#878787] text-[11px] sm:text-xs line-through tabular-nums">
              {formatINR(product.compareAtPrice)}
            </span>
          )}
          <span className="font-bold text-[13px] sm:text-sm text-[#212121] tabular-nums">
            {formatINR(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
