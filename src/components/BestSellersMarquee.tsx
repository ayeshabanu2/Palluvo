'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { SareeProduct } from '@/types';

interface BestSellersMarqueeProps {
  trendingSarees: SareeProduct[];
}

export default function BestSellersMarquee({ trendingSarees }: BestSellersMarqueeProps): React.JSX.Element {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="w-full mt-2">
      <div className="relative w-full overflow-hidden flex items-center group mask-image-fade">
        {/* Fading edges for the marquee */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#2B211D] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#2B211D] to-transparent z-10 pointer-events-none" />

        <div
          className={`flex gap-4 sm:gap-6 animate-marquee hover:pause-marquee focus-within:pause-marquee w-max py-2 px-4 ${
            isPaused ? 'pause-marquee' : ''
          }`}
          style={isPaused ? { animationPlayState: 'paused' } : undefined}
        >
          {/* Double the array for seamless infinite scrolling */}
          {[...trendingSarees, ...trendingSarees].map((saree, i) => (
            <Link
              href={`/product/${saree.id}`}
              key={`${saree.id}-${i}`}
              className="relative w-64 h-[28rem] sm:w-80 sm:h-[34rem] lg:w-[17rem] lg:h-[26rem] rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-2xl hover:border-[#D6B878]/80 transition-all duration-300 hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B878]"
              aria-label={`Shop ${saree.name}`}
            >
              <Image
                src={`/${(saree.images && saree.images.length > 0 ? saree.images[0] : 'images/hero_saree_art.jpg')}`}
                alt={saree.name}
                fill
                sizes="(max-width: 640px) 256px, (max-width: 1024px) 320px, 272px"
                className="object-cover"
              />
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 lg:mt-3">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#D6B878] uppercase tracking-[0.15em] text-center">
          Best Sellers
        </h1>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          aria-label={isPaused ? 'Play best sellers animation' : 'Pause best sellers animation'}
          aria-pressed={isPaused}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border border-[#D6B878]/40 bg-[#2B211D]/80 backdrop-blur-md text-[#D6B878] hover:bg-[#641C2D] hover:border-[#D6B878] transition-colors text-xs font-medium tracking-wider uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B878] min-h-[44px] min-w-[44px] shadow-sm cursor-pointer"
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Play</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Pause</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
