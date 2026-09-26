import React from 'react';
import Link from 'next/link';
import { 
  PALLUVO_TOP_MODELS, 
  FESTIVE_SAREES, 
  SAREE_OCCASIONS, 
  SAREE_PRODUCTS 
} from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { Sparkles, ArrowRight, ShieldCheck, Award, HeartHandshake, Scissors } from 'lucide-react';

export default function HomePage() {
  const trendingSarees = [
    SAREE_PRODUCTS[25], // Regal Patan Patola Double Ikat
    SAREE_PRODUCTS[26], // Liquid Gold Tissue Kanjivaram
    SAREE_PRODUCTS[27], // Midnight Shikargah Banarasi
    SAREE_PRODUCTS[28], // Kashmiri Tilla Pashmina
    SAREE_PRODUCTS[0],  // Royal Banarasi
    SAREE_PRODUCTS[1],  // Classic Kanjivaram
    SAREE_PRODUCTS[13], // Bridal Heirloom Crimson Kanjivaram
    SAREE_PRODUCTS[4]   // Traditional Paithani
  ].filter(Boolean);
  const festiveSarees = SAREE_PRODUCTS.filter(p => p.occasion === 'Festive' || p.occasion === 'Wedding').slice(0, 4);

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#2B211D]">
        {/* Background Image with Dark Vignette */}
        <div className="absolute inset-0">
          <img
            src="/images/hero_campaign.jpg"
            alt="Palluvo Luxury Saree Muse"
            className="w-full h-full object-cover object-center opacity-45 scale-105 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2B211D] via-[#2B211D]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2B211D]/80 via-transparent to-[#2B211D]/80" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center text-white py-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D6B878]/40 bg-[#2B211D]/60 backdrop-blur-md mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#D6B878]" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#D6B878] font-medium">
              Autumn / Festive 2026 Collection
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Every drape, <br />
            <span className="font-serif italic font-normal text-[#D6B878]">a little magic.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#EDE3D5]/90 font-light tracking-wide leading-relaxed mb-10">
            India's most celebrated handwoven traditions reimagined for the modern muse. 
            Strictly 100% authentic pure silk sarees, directly curated from master weaving ateliers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sarees"
              className="w-full sm:w-auto bg-[#641C2D] hover:bg-[#7A3043] text-white px-8 py-4 rounded-full text-xs font-semibold tracking-[0.2em] uppercase transition shadow-2xl flex items-center justify-center gap-2 border border-[#8B1E2B]"
            >
              Shop Curated Collection <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#signature-models"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-[#EDE3D5] hover:text-white px-8 py-4 rounded-full text-xs font-semibold tracking-[0.2em] uppercase transition backdrop-blur-sm border border-white/20 flex items-center justify-center"
            >
              Explore Top Models
            </a>
          </div>

          {/* Quick trust strip */}
          <div className="mt-14 pt-8 border-t border-white/15 flex flex-wrap items-center justify-center gap-8 text-xs text-[#EDE3D5]/80">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D6B878]" /> Silk Mark Certified Purity
            </span>
            <span className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#D6B878]" /> Direct from master weavers
            </span>
            <span className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[#D6B878]" /> Custom Blouse Tailoring Service
            </span>
          </div>
        </div>
      </section>


      {/* 2. THE TOP SAREE MODELS (Signature 8 Curation) */}
      <section id="signature-models" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-28 sm:scroll-mt-36">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
            The Atelier Showcase
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            The Top Saree Models
          </h2>
          <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
          <p className="text-xs sm:text-sm text-[#6D625D]">
            Explore our eight signature saree styles, each masterfully crafted with authentic silk, heritage motifs, and enduring artistry.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {PALLUVO_TOP_MODELS.map((model) => (
            <Link
              key={model.id}
              href={`/sarees?type=${encodeURIComponent(model.filterType)}`}
              className="group relative rounded-xl overflow-hidden bg-white border border-[#EDE3D5] shadow-xs hover:shadow-2xl transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#EDE3D5]">
                <img
                  src={`/${model.image}`}
                  alt={model.name}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4">
                  <span className="bg-[#641C2D]/90 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded uppercase tracking-wider">
                    {model.tag}
                  </span>
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-4 sm:left-4 sm:right-4 text-white">
                  <span className="text-[9px] sm:text-[11px] uppercase tracking-wider text-[#D6B878] font-medium block">
                    {model.region}
                  </span>
                  <h3 className="font-serif text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 text-white leading-tight line-clamp-1">
                    {model.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#EDE3D5]/90 line-clamp-1 mt-0.5 font-light">
                    {model.subtitle}
                  </p>
                </div>
              </div>

              <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                <p className="text-[11px] sm:text-xs text-[#6D625D] leading-relaxed mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                  {model.desc}
                </p>
                <div className="flex items-center justify-between text-[10px] sm:text-xs pt-2.5 sm:pt-3 border-t border-[#EDE3D5] text-[#2B211D]">
                  <span className="text-[#B08D57] font-semibold">{model.artisanHours}</span>
                  <span className="font-semibold uppercase tracking-wider text-[#641C2D] group-hover:translate-x-1 transition-transform flex items-center gap-0.5 sm:gap-1">
                    Explore <span className="hidden xs:inline">Drapes</span> <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
            <span className="text-xs font-semibold tracking-[0.25em] text-[#D6B878] uppercase block mb-2">
              Limited Festive Edit
            </span>
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
            <img
              src="/images/hero_navratri_motion.jpg"
              alt="Festive Drape"
              className="w-full h-full object-cover object-center opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#641C2D] to-transparent" />
          </div>
        </div>
      </section>


      {/* 4. TRENDING SAREES (Client-side interactive Product Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
              Most Loved Drapes
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
              Trending In Atelier
            </h2>
          </div>
          <Link
            href="/sarees"
            className="text-xs font-semibold uppercase tracking-wider text-[#641C2D] hover:text-[#4E1422] flex items-center gap-1.5 transition"
          >
            View All 25 Sarees <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {trendingSarees.map((saree) => (
            <ProductCard key={saree.id} product={saree} />
          ))}
        </div>
      </section>


      {/* 5. SHOP BY OCCASION (Saree-only curations) */}
      <section className="bg-[#EDE3D5]/50 py-16 border-y border-[#EDE3D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
              Curated Moments
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
              Drapes For Every Occasion
            </h2>
            <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
            <p className="text-xs sm:text-sm text-[#6D625D]">
              Whether it is the sacred pheras of a wedding or a contemporary evening cocktail, discover your ideal silhouette.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {SAREE_OCCASIONS.map((occ) => (
              <Link
                key={occ.id}
                href={`/sarees?occasion=${encodeURIComponent(occ.filterParam)}`}
                className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-[#EDE3D5] shadow-xs hover:shadow-xl transition-all duration-300"
              >
                <img
                  src={`/${occ.image}`}
                  alt={occ.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-serif text-lg sm:text-xl font-bold">{occ.name}</h3>
                  <p className="text-[11px] text-[#D6B878] line-clamp-1">{occ.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* 6. CRAFTSMANSHIP & WEAVING CLUSTERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden bg-[#EDE3D5] aspect-[4/3] shadow-lg">
            <img
              src="/images/craftsmanship.jpg"
              alt="Handloom Weaving Craftsmanship"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#641C2D]/10" />
          </div>

          <div className="space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block">
              Heritage Preservation
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D] leading-tight">
              Honoring India’s Master Handloom Weavers
            </h2>
            <p className="text-xs sm:text-sm text-[#6D625D] leading-relaxed">
              Every Palluvo saree is an artistic conversation that takes between 75 to 210 meticulous weaving hours on traditional pit looms. From the Kadhwa jaals of Varanasi to the interlocking Korvai temple borders of Kanchipuram, each fold preserves sacred Indian cultural artistry.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white rounded-lg border border-[#EDE3D5]">
                <h4 className="font-serif text-lg font-bold text-[#641C2D]">Silk Mark Certified</h4>
                <p className="text-xs text-[#8E857B] mt-1">100% natural pure silk fibers tested for authentic thread density.</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-[#EDE3D5]">
                <h4 className="font-serif text-lg font-bold text-[#641C2D]">Complimentary Fall & Pico</h4>
                <p className="text-xs text-[#8E857B] mt-1">Every saree arrives finished with premium matching fall and pico edging.</p>
              </div>
            </div>

            <div>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#641C2D] hover:text-[#4E1422] underline underline-offset-4"
              >
                Read Atelier Story →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
