import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  PALLUVO_TOP_MODELS, 
  SAREE_OCCASIONS, 
  SAREE_PRODUCTS 
} from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Scissors } from 'lucide-react';
import { Metadata } from 'next';
import { SareeProduct } from '@/types';

export const metadata: Metadata = {
  title: 'PALLUVO | Every drape, a little magic | Contemporary Indian Luxury Sarees',
  description: 'Contemporary luxury Indian saree fashion house. Curated signature sarees: Kanjivaram, Banarasi, Chanderi, Paithani, Organza, Ready-to-wear. 100% Silk Mark certified.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage(): React.JSX.Element {
  const trendingSarees: SareeProduct[] = [
    SAREE_PRODUCTS[25], // Regal Patan Patola Double Ikat
    SAREE_PRODUCTS[26], // Liquid Gold Tissue Kanjivaram
    SAREE_PRODUCTS[27], // Midnight Shikargah Banarasi
    SAREE_PRODUCTS[28], // Kashmiri Tilla Pashmina
    SAREE_PRODUCTS[0],  // Royal Banarasi
    SAREE_PRODUCTS[1],  // Classic Kanjivaram
    SAREE_PRODUCTS[13], // Bridal Heirloom Crimson Kanjivaram
    SAREE_PRODUCTS[4]   // Traditional Paithani
  ].filter((s): s is SareeProduct => Boolean(s));

  const newCollectionSarees: SareeProduct[] = SAREE_PRODUCTS.slice(5, 13);

  return (
    <div className="space-y-12 sm:space-y-16 pb-0">
      
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative bg-[#2B211D] text-white overflow-hidden lg:min-h-[85vh] lg:flex lg:items-center">
        {/* Desktop-only full-bleed background image */}
        <div className="hidden lg:block absolute inset-0">
          <Image
            src="/images/hero_campaign.jpg"
            alt="Model draped in an emerald green handloom silk saree with gold zari border in a sandstone palace courtyard"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right opacity-90 scale-100 transition-transform duration-1000 ease-out"
          />
          {/* Protected text backdrop gradient on the left, clear open saree view on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#2B211D] via-[#2B211D]/80 md:via-[#2B211D]/65 lg:via-[#2B211D]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B211D] via-transparent to-black/30" />
        </div>

        {/* Responsive Container */}
        <div className="relative z-10 w-full px-0 py-8 sm:py-12 lg:py-4">
          <div className="flex flex-col items-center">
            
            {/* Editorial Text Column */}
            <div className="w-full flex flex-col items-start lg:items-center text-left lg:text-center text-white mx-auto pt-0 lg:pt-4 px-0">
              {/* Desktop-only Editorial Collection Pill (mobile already carries campaign badge in the image card) */}
              <div className="hidden lg:inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D6B878]/40 bg-[#2B211D]/75 backdrop-blur-md mb-3 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-[#D6B878] shrink-0" />
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#D6B878] font-medium whitespace-nowrap">
                  Autumn / Festive 2026 Collection
                </span>
              </div>

              <h2 className="font-serif text-[32px] xs:text-4xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-white mt-2 mb-4 sm:mb-6 lg:mb-4 leading-[1.2] lg:leading-[1.15] drop-shadow-sm w-full text-center">
                Every drape,{' '}
                <span className="font-serif italic font-normal text-[#D6B878]">a little magic.</span>
              </h2>

              <div className="w-full mt-2">
                <div className="relative w-full overflow-hidden flex items-center group mask-image-fade">
                  {/* Fading edges for the marquee */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#2B211D] to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#2B211D] to-transparent z-10 pointer-events-none"></div>
                  
                  <div className="flex gap-4 sm:gap-6 animate-marquee hover:pause-marquee w-max py-2 px-4">
                    {/* Double the array for seamless infinite scrolling */}
                    {[...trendingSarees, ...trendingSarees].map((saree, i) => (
                      <Link 
                        href={`/product/${saree.id}`} 
                        key={`${saree.id}-${i}`}
                        className="relative w-64 h-[28rem] sm:w-80 sm:h-[34rem] lg:w-[17rem] lg:h-[26rem] rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-2xl hover:border-[#D6B878]/80 transition-all duration-300 hover:-translate-y-2"
                        aria-label={`Shop ${saree.name}`}
                      >
                        <Image
                          src={`/${(saree.images && saree.images.length > 0 ? saree.images[0] : 'images/hero_saree_art.jpg')}`}
                          alt={saree.name}
                          fill
                          sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 192px"
                          className="object-cover"
                        />
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4 lg:mt-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#D6B878] uppercase tracking-[0.15em] text-center w-full">Best Sellers</h1>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>


      {/* 2. NEW COLLECTION */}
      <section id="new-collection" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28 sm:scroll-mt-36 pt-12 sm:pt-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            New Collection
          </h2>
          <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {newCollectionSarees.map((saree) => (
            <ProductCard key={saree.id} product={saree} />
          ))}
        </div>
      </section>


      {/* 3. FESTIVE EDIT PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#641C2D] via-[#7A3043] to-[#4E1422] text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-xl">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              Celebrate in Heirloom Grandeur with up to 28% Off
            </h2>
            <p className="text-xs sm:text-sm text-[#EDE3D5] mb-6 leading-relaxed">
              From auspicious Bandhani dots to Kadhwa real-gold zari brocades, enjoy catalog savings up to 28% off, plus an extra 10% stackable discount at checkout with code PALLUVO10.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/sarees?occasion=Festive"
                className="bg-[#D6B878] hover:bg-[#B08D57] text-[#2B211D] px-6 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition shadow-md"
              >
                Shop The Festive Edit
              </Link>
              <div className="border border-[#D6B878]/40 px-4 py-2 rounded-full text-xs text-[#D6B878] tracking-widest font-mono">
                STACKABLE 10% OFF: <span className="font-bold text-white">PALLUVO10</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/2">
            <Image
              src="/images/hero_navratri_motion.jpg"
              alt="Festive Drape"
              fill
              sizes="50vw"
              className="object-cover object-center opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#641C2D] to-transparent" />
          </div>
        </div>
      </section>


      {/* 4. TRENDING SAREES (Client-side interactive Product Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
              Trending
            </h2>
          </div>
          <Link
            href="/sarees"
            className="text-xs font-semibold uppercase tracking-wider text-[#641C2D] hover:text-[#4E1422] flex items-center gap-1.5 transition"
          >
            View All {SAREE_PRODUCTS.length} Sarees <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {trendingSarees.map((saree) => (
            <ProductCard key={saree.id} product={saree} />
          ))}
        </div>
      </section>


      {/* 5. SHOP BY OCCASION (Saree-only curations) */}
      <section className="bg-[#EDE3D5]/50 py-16 border-y border-[#EDE3D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
              Drapes For Every Occasion
            </h2>
            <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
            <p className="text-xs sm:text-sm text-[#6D625D]">
              Whether it is the sacred pheras of a wedding or a contemporary evening cocktail, discover your ideal silhouette.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {SAREE_OCCASIONS.map((occ) => (
              <Link
                key={occ.id}
                href={`/sarees?occasion=${encodeURIComponent(occ.filterParam)}`}
                className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-[#EDE3D5] shadow-xs hover:shadow-xl transition-all duration-300"
              >
                <Image
                  src={`/${occ.image}`}
                  alt={occ.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-serif text-lg sm:text-xl font-bold">{occ.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
