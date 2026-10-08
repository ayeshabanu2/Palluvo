'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { X, Heart, ShoppingBag, ShieldCheck, Star, ArrowRight } from 'lucide-react';
import { formatINR } from '@/utils/format';
import { BlouseOption } from '@/types';
import { useBodyScrollLock } from '@/utils/useBodyScrollLock';

export default function QuickViewModal(): React.JSX.Element | null {
  const { quickViewProduct, setQuickViewProduct, addToCart, setIsCartOpen, wishlist, toggleWishlist } = useStore();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBlouse, setSelectedBlouse] = useState<string>('unstitched');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const isOpen = quickViewProduct !== null;

  // Lock background body scroll when quick view modal is open
  useBodyScrollLock(isOpen);

  // Focus trap and Escape key listener for accessible dialog
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuickViewProduct(null);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setQuickViewProduct]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWishlisted = wishlist.includes(product.id);
  const images = product.images && product.images.length > 0 ? product.images : ['images/hero_saree_art.jpg'];

  const blouseOptions: BlouseOption[] = product.blouseOptions || [
    { id: 'unstitched', name: 'Unstitched Matching Fabric Included', price: 0 },
    { id: 'tailored-classic', name: 'Custom Tailored Classic Blouse', price: 1200 }
  ];

  const currentBlouse = blouseOptions.find((b) => b.id === selectedBlouse) || blouseOptions[0];

  const handleAdd = () => {
    addToCart(product.id, 1, {
      selectedColor: selectedColor || product.color,
      blouseOptionId: currentBlouse.id,
      blouseOptionName: currentBlouse.name,
      blousePrice: currentBlouse.price
    });
    setQuickViewProduct(null);
    setIsCartOpen(true);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickViewTitle"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4"
    >
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
        onClick={() => setQuickViewProduct(null)} 
        aria-hidden="true"
      />

      <div 
        ref={modalRef}
        className="relative bg-[#F8F5EF] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-2 max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          ref={closeBtnRef}
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/90 text-[#2B211D] flex items-center justify-center hover:bg-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery Side */}
        <div className="bg-[#EDE3D5] flex flex-col justify-between p-6 overflow-hidden">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm">
            <Image
              src={`/${images[activeImageIndex] || images[0]}`}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 450px"
              className="object-cover object-top"
            />
            {product.badge && (
              <span className="absolute top-3 left-3 bg-[#641C2D] text-white text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider z-10">
                {product.badge}
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`View image ${idx + 1} of ${images.length} for ${product.name}`}
                  aria-pressed={activeImageIndex === idx}
                  className={`relative w-14 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${
                    activeImageIndex === idx ? 'border-[#641C2D]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={`/${img}`} alt={`Thumbnail ${idx + 1} of ${images.length} for ${product.name}`} fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Side */}
        <div className="p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#665E57] uppercase tracking-wider mb-2">
              <span>{product.sareeType}</span>
              {product.rating && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#2B211D] font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
                    <span>{product.rating}</span>
                    {product.reviewsCount && (
                      <span className="text-[#665E57] font-normal text-xs">
                        ({product.reviewsCount} reviews)
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <h2 id="quickViewTitle" className="font-serif text-2xl md:text-3xl font-bold text-[#2B211D] leading-tight">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-3 my-3">
              <span className="text-2xl font-bold text-[#641C2D] tabular-nums">{formatINR(product.price + currentBlouse.price)}</span>
              {product.compareAtPrice && (
                <span className="text-sm text-[#665E57] line-through tabular-nums">{formatINR(product.compareAtPrice)}</span>
              )}
              {product.discount && (
                <span className="text-xs bg-[#B08D57]/20 text-[#8C6A35] font-bold px-2 py-0.5 rounded tabular-nums">
                  {product.discount}
                </span>
              )}
            </div>

            <p className="text-xs text-[#6D625D] leading-relaxed mb-4">
              {product.description || product.tagline}
            </p>

            {/* Colors */}
            {product.swatches && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#2B211D] uppercase tracking-wider mb-1.5">
                  Color: <span className="font-normal text-[#6D625D]">{selectedColor || product.color}</span>
                </label>
                <div className="flex flex-wrap gap-1 items-center">
                  {product.swatches.map((swatch, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColor(swatch.name)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                      title={swatch.name}
                      aria-label={`Select color ${swatch.name}`}
                      aria-pressed={(selectedColor || product.color) === swatch.name}
                    >
                      <span
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          (selectedColor || product.color) === swatch.name ? 'border-[#641C2D] scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Blouse Stitching Option */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#2B211D] uppercase tracking-wider mb-2">
                Blouse Stitching Service:
              </label>
              <div className="space-y-2">
                {blouseOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                      selectedBlouse === opt.id
                        ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]'
                        : 'border-[#EDE3D5] text-[#2B211D] hover:bg-[#F8F5EF]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quick_blouse"
                        checked={selectedBlouse === opt.id}
                        onChange={() => setSelectedBlouse(opt.id)}
                        className="accent-[#641C2D]"
                      />
                      <span>{opt.name}</span>
                    </div>
                    <span className="tabular-nums">{opt.price === 0 ? 'FREE' : `+${formatINR(opt.price)}`}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="flex-1 bg-[#641C2D] hover:bg-[#4E1422] text-white py-3.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Bag
              </button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3.5 min-w-[44px] min-h-[44px] rounded-full border border-[#EDE3D5] transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${
                  isWishlisted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-[#2B211D] hover:bg-[#F8F5EF]'
                }`}
                aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                aria-pressed={isWishlisted}
                title={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-600' : ''}`} />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EDE3D5] flex items-center justify-between text-[11px] text-[#665E57]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" /> Silk Mark Certified
              </span>
              <Link
                href={`/product/${product.slug || product.id}`}
                onClick={() => setQuickViewProduct(null)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#641C2D] underline"
              >
                <span>Full Product Specifications</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
