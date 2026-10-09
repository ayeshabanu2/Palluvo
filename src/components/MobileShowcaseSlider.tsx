"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const slides = [
  {
    image: "/images/hero_campaign.jpg",
    title: "SHOP CATEGORIES",
    link: "/sarees",
  },
  {
    image: "/images/premium_saree_hero_1791524587771.jpg",
    title: "NEW ARRIVALS",
    link: "/sarees?type=New",
  },
  {
    image: "/images/premium_traditional_sari_hero_1791543082151.jpg",
    title: "FESTIVE EDIT",
    link: "/sarees?occasion=Festive",
  },
  {
    image: "/images/premium_saree_hero_wide_1791524609290.jpg",
    title: "SIGNATURE DRAPES",
    link: "/sarees",
  }
];

export default function MobileShowcaseSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // 5 seconds per slide
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lg:hidden w-full order-1">
      <div className="relative rounded-[16px] overflow-hidden aspect-[4/5] sm:aspect-[3/4] shadow-2xl border border-[#D6B878]/30 bg-[#241B17] w-full max-w-md mx-auto">
        {slides.map((slide, index) => (
          <Image
            key={index}
            src={slide.image}
            alt="Palluvo Luxury Handloom"
            fill
            priority={index === 0}
            sizes="(max-width: 640px) 100vw, 448px"
            className={`object-cover object-[75%_center] transition-opacity duration-1000 ease-in-out ${
              currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />
        
        <Link
          href={slides[currentSlide].link}
          className="absolute bottom-4 left-4 right-4 mx-auto w-max bg-[#2B211D]/85 backdrop-blur-md border border-[#D6B878]/40 px-6 py-2.5 rounded-full flex items-center justify-center gap-2 max-w-[calc(100%-32px)] hover:bg-[#641C2D] hover:border-[#641C2D] transition-colors z-20 group"
        >
          <span className="w-2 h-2 rounded-full bg-[#D6B878] group-hover:bg-white animate-pulse shrink-0 transition-colors" />
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-[#D6B878] group-hover:text-white font-bold truncate transition-colors">
            {slides[currentSlide].title}
          </span>
        </Link>
      </div>
      
      {/* Interactive Indicator Dots */}
      <div className="flex justify-center items-center gap-2 mt-4 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentSlide === index 
                ? 'bg-[#D6B878] w-6' 
                : 'bg-white/30 hover:bg-white/60 w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
