'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SAREE_PRODUCTS } from '@/data/products';
import { useStore } from '@/context/StoreContext';
import ProductCard from '@/components/ProductCard';
import { formatINR } from '@/utils/format';
import { BlouseOption, SareeProduct } from '@/types';
import { 
  Heart, 
  ShoppingBag, 
  ShieldCheck, 
  Award, 
  Truck, 
  RotateCcw, 
  Star, 
  Share2, 
  ChevronRight,
  Scissors
} from 'lucide-react';

export default function ProductDetailPage(): React.JSX.Element {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const product = SAREE_PRODUCTS.find((p) => p.slug === slug || p.id === slug);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-bold text-[#2B211D]">Saree Not Found</h1>
        <p className="text-xs text-[#665E57] mt-2 mb-6">The requested drape might have been moved or archived.</p>
        <Link href="/sarees" className="bg-[#641C2D] text-white px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase">
          Back to All Sarees
        </Link>
      </div>
    );
  }

  return <ProductDetailContent product={product} />;
}

function ProductDetailContent({ product }: { product: SareeProduct }): React.JSX.Element {
  const { wishlist, toggleWishlist, addToCart, setIsCartOpen, showToast } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  const images = product.images && product.images.length > 0 ? product.images : ['images/hero_saree_art.jpg'];
  const [activeImage, setActiveImage] = useState<string>(images[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.color);
  const [selectedBlouse, setSelectedBlouse] = useState<string>('unstitched');
  const [quantity] = useState<number>(1);

  const blouseOptions: BlouseOption[] = product.blouseOptions || [
    { id: "unstitched", name: "Unstitched Matching Fabric (0.8m Included)", price: 0 },
    { id: "tailored-classic", name: "Custom Tailored - Classic Elbow Sleeve & U-Neck", price: 1200 },
    { id: "tailored-sleeveless", name: "Custom Tailored - Deep Sweetheart Sleeveless", price: 1200 },
    { id: "ready-padded", name: "Ready-to-Wear Premium Padded Corset Blouse", price: 1800 }
  ];

  const currentBlouse = blouseOptions.find((b) => b.id === selectedBlouse) || blouseOptions[0];
  const totalPrice = (product.price + currentBlouse.price) * quantity;

  const handleAddToCart = () => {
    addToCart(product.id, quantity, {
      selectedColor,
      blouseOptionId: currentBlouse.id,
      blouseOptionName: currentBlouse.name,
      blousePrice: currentBlouse.price
    });
    setIsCartOpen(true);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!');
    }
  };

  const relatedProducts = SAREE_PRODUCTS.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.occasion === product.occasion)
  ).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-16">
      
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#665E57]">
        <Link href="/" className="hover:text-[#641C2D]">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/sarees" className="hover:text-[#641C2D]">Sarees</Link>
        {product.sareeType && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/sarees?type=${encodeURIComponent(product.sareeType)}`} className="hover:text-[#641C2D]">
              {product.sareeType}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#2B211D] font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Gallery Column */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] bg-[#EDE3D5]/40 rounded-xl overflow-hidden border border-[#EDE3D5] shadow-xs">
            <Image
              src={`/${activeImage}`}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-top"
            />
            {product.badge && (
              <span className="absolute top-4 left-4 bg-[#641C2D] text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider shadow-sm z-10">
                {product.badge}
              </span>
            )}
            <button
              onClick={handleShare}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-[#241F1D] hover:bg-white shadow-sm z-10"
              title="Share"
              aria-label="Share product link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-20 h-24 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${
                    activeImage === img ? 'border-[#641C2D] scale-102 shadow-sm' : 'border-[#EDE3D5] opacity-75 hover:opacity-100'
                  }`}
                  aria-label={`View product image ${i + 1}`}
                >
                  <Image src={`/${img}`} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B08D57]">
                {product.specifications?.origin || product.sareeType}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="font-bold">{product.rating || '4.9'}</span>
                <span className="text-amber-800/60">({product.reviewsCount || 28} reviews)</span>
              </div>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D] leading-tight">
              {product.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#6D625D] mt-1 font-serif italic">
              {product.tagline}
            </p>
          </div>

          {/* Price Strip */}
          <div className="p-4 bg-white rounded-xl border border-[#EDE3D5] flex items-baseline gap-4 shadow-xs">
            <span className="text-3xl font-bold text-[#641C2D]">
              {formatINR(totalPrice)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-[#665E57] line-through">
                {formatINR(product.compareAtPrice * quantity)}
              </span>
            )}
            {product.discount && (
              <span className="text-xs bg-[#B08D57]/20 text-[#8C6A35] font-bold px-2.5 py-1 rounded">
                Save {product.discount}
              </span>
            )}
            <span className="ml-auto text-[11px] text-[#134E4A] font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Taxes Included
            </span>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#6D625D] leading-relaxed">
            {product.description}
          </p>

          {/* Color Selection */}
          {product.swatches && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2">
                Available Shade: <span className="font-normal text-[#6D625D]">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-1 items-center">
                {product.swatches.map((swatch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedColor(swatch.name)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                    aria-label={`Select color ${swatch.name}`}
                  >
                    <span
                      className={`block w-6 h-6 rounded-full border-2 transition ${
                        selectedColor === swatch.name ? 'border-[#641C2D] scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blouse Customization Option */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#2B211D] uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-[#B08D57]" /> Blouse Stitching Service:
              </label>
              <span className="text-[11px] text-[#665E57]">Custom Atelier Finishing</span>
            </div>

            <div className="space-y-2">
              {blouseOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedBlouse === opt.id
                      ? 'border-[#641C2D] bg-[#641C2D]/5 font-semibold text-[#641C2D]'
                      : 'border-[#EDE3D5] text-[#2B211D] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="pdp_blouse"
                      checked={selectedBlouse === opt.id}
                      onChange={() => setSelectedBlouse(opt.id)}
                      className="accent-[#641C2D]"
                    />
                    <span>{opt.name}</span>
                  </div>
                  <span className="font-bold">{opt.price === 0 ? 'FREE' : `+${formatINR(opt.price)}`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-4 flex gap-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-[#641C2D] hover:bg-[#4E1422] text-white py-4 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl transition"
            >
              <ShoppingBag className="w-4 h-4" /> Add to Shopping Bag
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-4 min-w-[44px] min-h-[44px] rounded-full border transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] ${
                isWishlisted ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-[#2B211D] border-[#EDE3D5] hover:bg-[#F8F5EF]'
              }`}
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              aria-pressed={isWishlisted}
              title={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-600' : ''}`} />
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="p-4 bg-white rounded-xl border border-[#EDE3D5] grid grid-cols-2 gap-3 text-xs text-[#6D625D]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B08D57] flex-shrink-0" />
              <span>100% Pure Silk Mark Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#B08D57] flex-shrink-0" />
              <span>Complimentary Insured Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#B08D57] flex-shrink-0" />
              <span>7-Day Doorstep Pickup Return</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#B08D57] flex-shrink-0" />
              <span>Complimentary Fall & Pico Edging</span>
            </div>
          </div>

          {/* Full Specifications Table */}
          {product.specifications && (
            <div className="pt-4">
              <h3 className="font-serif text-lg font-bold text-[#2B211D] mb-3">Authentic Specifications</h3>
              <div className="bg-white rounded-xl border border-[#EDE3D5] divide-y divide-[#EDE3D5] text-xs">
                {Object.entries(product.specifications)
                  .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
                  .map(([key, value]) => (
                    <div key={key} className="flex p-3">
                      <span className="w-1/3 font-semibold uppercase tracking-wider text-[#665E57]">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="w-2/3 text-[#2B211D] font-medium">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Related Sarees */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-[#EDE3D5]">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B211D] mb-6">
            You May Also Admire
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
