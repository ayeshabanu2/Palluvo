import React from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, HeartHandshake, Scissors, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'About Atelier | PALLUVO Luxury Sarees',
  description: 'Learn about Palluvo - Contemporary Luxury Indian Saree Fashion House & Boutique Atelier.'
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
          The Atelier Story
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#2B211D] leading-tight">
          Where Centuries of Handloom Heritage Meet the Modern Muse.
        </h1>
        <div className="w-20 h-0.5 bg-[#B08D57] mx-auto mt-6 mb-6" />
        <p className="font-serif italic text-lg sm:text-xl text-[#641C2D]">
          “Every drape, a little magic.”
        </p>
      </div>

      {/* Main Philosophy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EDE3D5] shadow-lg">
          <img src="/images/craftsmanship.jpg" alt="Weaving loom" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-4 text-xs sm:text-sm text-[#6D625D] leading-relaxed">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B211D]">
            Strictly 100% Saree Merchandising
          </h2>
          <p>
            Unlike contemporary portals overwhelmed by twenty disparate ethnic categories, <strong>PALLUVO</strong> is founded on an uncompromising devotion: strictly authentic sarees. Zero lehengas, kurtis, gowns, or western wear.
          </p>
          <p>
            We believe the Indian saree is the pinnacle of sculptural fashion — six yards of unstitched poetry that transforms the posture, grace, and aura of whoever adorns it.
          </p>
          <p>
            By working directly with master weaving clusters in Varanasi, Kanchipuram, Yeola, Pochampally, and Chanderi, we ensure India's national textile heritage flourishes with fair artisan pricing and authenticated silk certification.
          </p>
        </div>
      </div>

      {/* Core Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
        <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] text-center">
          <Award className="w-8 h-8 text-[#B08D57] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#2B211D] mb-1">Authentic Weave Clusters</h3>
          <p className="text-xs text-[#8E857B]">Every drape is sourced directly from certified geographical origin looms.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] text-center">
          <ShieldCheck className="w-8 h-8 text-[#B08D57] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#2B211D] mb-1">Silk Mark Purity</h3>
          <p className="text-xs text-[#8E857B]">Natural Mulberry, Katan, and Tussar silk threads tested to supreme purity benchmarks.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] text-center">
          <Scissors className="w-8 h-8 text-[#B08D57] mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-[#2B211D] mb-1">Custom Atelier Blouse Tailoring</h3>
          <p className="text-xs text-[#8E857B]">Pair your saree with unstitched matching yardage or custom bespoke corset blouses.</p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#2B211D] text-white p-8 sm:p-12 rounded-2xl text-center space-y-4">
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#D6B878]">
          Experience the Magic of the Drape
        </h3>
        <p className="text-xs sm:text-sm text-[#EDE3D5]/80 max-w-lg mx-auto">
          Explore our signature edit of Kanjivarams, Banarasis, Paithanis, and Ready-to-Wear sarees.
        </p>
        <Link
          href="/sarees"
          className="inline-flex items-center gap-2 bg-[#641C2D] text-white px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition mt-2 shadow-lg"
        >
          Explore Collection <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
