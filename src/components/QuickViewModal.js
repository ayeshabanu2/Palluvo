'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { X, Heart, ShoppingBag, ShieldCheck, Check, Star } from 'lucide-react';
import { formatINR } from '@/utils/format';

export default function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, setIsCartOpen, wishlist, toggleWishlist } = useStore();
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedBlouse, setSelectedBlouse] = useState('unstitched');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWishlisted = wishlist.includes(product.id);
  const images = product.images && product.images.length > 0 ? product.images : ['images/hero_saree_art.jpg'];

  const blouseOptions = product.blouseOptions || [
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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
        onClick={() => setQuickViewProduct(null)} 
      />

      <div className="relative bg-[#F8F5EF] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 grid grid-cols-1 md:grid-cols-2 max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/90 text-[#2B211D] flex items-center justify-center hover:bg-white shadow-md"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Gallery Side */}
        <div className="bg-[#EDE3D5] flex flex-col justify-between p-6 overflow-hidden">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm">
            <img
              src={`/${images[activeImageIndex] || images[0]}`}
              alt={product.name}
              className="w-full h-full object-cover object-top"
            />
            {product.badge && (
              <span className="absolute top-3 left-3 bg-[#641C2D] text-white text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                {product.badge}
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-14 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition ${
                    activeImageIndex === idx ? 'border-[#641C2D]' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={`/${img}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Side */}
        <div className="p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-white">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#8E857B] uppercase tracking-wider mb-2">
              <span>{product.sareeType}</span>
              {product.rating && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{product.rating}</span>
                    {product.reviewsCount && (
                      <span className="text-[#8E857B] font-normal text-xs">
                        ({product.reviewsCount} reviews)
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#2B211D] leading-tight">
              {product.name}
            </h2>

            <div className="flex items-baseline gap-3 my-3">
              <span className="text-2xl font-bold text-[#641C2D]">{formatINR(product.price + currentBlouse.price)}</span>
              {product.compareAtPrice && (
                <span className="text-sm text-[#8E857B] line-through">{formatINR(product.compareAtPrice)}</span>
              )}
              {product.discount && (
                <span className="text-xs bg-[#B08D57]/20 text-[#8C6A35] font-bold px-2 py-0.5 rounded">
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
                <div className="flex gap-2">
                  {product.swatches.map((swatch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(swatch.name)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        (selectedColor || product.color) === swatch.name ? 'border-[#641C2D] scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    />
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
                    <span>{opt.price === 0 ? 'FREE' : `+${formatINR(opt.price)}`}</span>
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
                className={`p-3.5 rounded-full border border-[#EDE3D5] transition shadow-xs ${
                  isWishlisted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-[#2B211D] hover:bg-[#F8F5EF]'
                }`}
                aria-label="Wishlist toggle"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-600' : ''}`} />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EDE3D5] flex items-center justify-between text-[11px] text-[#8E857B]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" /> Silk Mark Certified
              </span>
              <Link
                href={`/product/${product.slug || product.id}`}
                onClick={() => setQuickViewProduct(null)}
                className="font-semibold text-[#641C2D] underline"
              >
                Full Product Specifications →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
