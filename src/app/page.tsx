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

  return (
    <div className="space-y-20 pb-20">
      
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

        {/* Responsive Grid Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
            
            {/* Mobile View: Dedicated Image Grid Card */}
            <div className="lg:hidden w-full order-1">
              <div className="relative rounded-[16px] overflow-hidden aspect-[4/5] sm:aspect-[3/4] shadow-2xl border border-[#D6B878]/30 bg-[#241B17] w-full max-w-md mx-auto">
                <Image
                  src="/images/hero_campaign.jpg"
                  alt="Model draped in an emerald green handloom silk saree with gold zari border in a sandstone palace courtyard"
                  fill
                  priority
                  sizes="(max-width: 640px) 100vw, 448px"
                  className="object-cover object-[75%_center]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 mx-auto w-max bg-[#2B211D]/85 backdrop-blur-md border border-[#D6B878]/40 px-4 py-2 rounded-full flex items-center gap-2 max-w-[calc(100%-32px)]">
                  <span className="w-2 h-2 rounded-full bg-[#D6B878] animate-pulse shrink-0" />
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#D6B878] font-bold truncate">
                    Autumn / Festive 2026 Drape
                  </span>
                </div>
              </div>
            </div>

            {/* Editorial Text Column (renders in grid below image on mobile, left column on desktop) */}
            <div className="w-full order-2 flex flex-col items-start text-left text-white mx-auto lg:mx-0 lg:max-w-2xl pt-2 sm:pt-4">
              {/* Desktop-only Editorial Collection Pill (mobile already carries campaign badge in the image card) */}
              <div className="hidden lg:inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D6B878]/40 bg-[#2B211D]/75 backdrop-blur-md mb-6 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-[#D6B878] shrink-0" />
                <span className="text-[11px] uppercase tracking-[0.25em] text-[#D6B878] font-medium whitespace-nowrap">
                  Autumn / Festive 2026 Collection
                </span>
              </div>

              <h1 className="font-serif text-[32px] xs:text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4 sm:mb-6 leading-[1.2] lg:leading-[1.15] drop-shadow-sm w-full">
                Every drape, <br className="hidden sm:block" />
                <span className="font-serif italic font-normal text-[#D6B878]">a little magic.</span>
              </h1>


              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 w-full">
                <Link
                  href="/sarees"
                  className="w-full sm:w-auto bg-[#641C2D] hover:bg-[#7A3043] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-xs font-semibold tracking-[0.18em] uppercase transition shadow-xl flex items-center justify-center gap-2 border border-[#8B1E2B] min-h-[48px]"
                >
                  Shop Curated Collection <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#signature-models"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-[#EDE3D5] hover:text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-xs font-semibold tracking-[0.18em] uppercase transition backdrop-blur-sm border border-white/20 flex items-center justify-center min-h-[48px]"
                >
                  Explore Top Models
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 3. THE TOP SAREE MODELS (Signature 8 Curation) */}
      <section id="signature-models" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28 sm:scroll-mt-36">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            The Top Saree Models
          </h2>
          <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {PALLUVO_TOP_MODELS.map((model) => (
            <Link
              key={model.id}
              href={`/sarees?type=${encodeURIComponent(model.filterType)}`}
              className="group relative rounded-xl overflow-hidden bg-white border border-[#EDE3D5] shadow-xs hover:shadow-2xl transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#EDE3D5]">
                <Image
                  src={`/${model.image}`}
                  alt={model.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                <div className="mb-2.5 sm:mb-3 border-b border-[#EDE3D5]/50 pb-2.5 sm:pb-3">
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-wider text-[#B08D57] font-bold block truncate">
                    <span className="sm:hidden">{model.shortRegion || model.region}</span>
                    <span className="hidden sm:inline">{model.region}</span>
                  </span>
                  <h3 className="font-serif text-base sm:text-xl font-bold mt-0.5 sm:mt-1 text-[#2B211D] leading-tight line-clamp-1">
                    {model.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#6D625D] line-clamp-2 mt-0.5 font-medium leading-snug">
                    <span className="sm:hidden">{model.shortSubtitle || model.subtitle}</span>
                    <span className="hidden sm:inline">{model.subtitle}</span>
                  </p>
                </div>
                <p className="text-[11px] sm:text-xs text-[#6D625D] leading-relaxed mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                  {model.desc}
                </p>
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 text-[10px] sm:text-xs pt-2.5 sm:pt-3 border-t border-[#EDE3D5] text-[#2B211D]">
                  <span className="text-[#665E57] font-semibold flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57] shrink-0" aria-hidden="true" />
                    <span className="sm:hidden">{model.shortArtisanHours || model.artisanHours}</span>
                    <span className="hidden sm:inline">{model.artisanHours}</span>
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-[#641C2D] group-hover:translate-x-1 transition-transform flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto sm:ml-0">
                    Explore <span className="hidden sm:inline">Drapes</span> <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
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
              Trending In Atelier
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
