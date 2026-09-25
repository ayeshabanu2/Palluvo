'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { SAREE_PRODUCTS } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';

export default function WishlistPage() {
  const { wishlist } = useStore();

  const wishlistedProducts = SAREE_PRODUCTS.filter(p => wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
          Saved Favorites
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
          Your Wishlist
        </h1>
        <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4" />
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16 bg-white p-8 rounded-2xl border border-[#EDE3D5]">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#2B211D]">Your Wishlist is Empty</h2>
          <p className="text-xs text-[#8E857B] mt-2 mb-6">
            Explore our curated luxury handloom sarees and tap the heart icon to save your favorites.
          </p>
          <Link
            href="/sarees"
            className="inline-block bg-[#641C2D] text-white px-8 py-3.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#4E1422] transition"
          >
            Discover Sarees
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#8E857B] mb-6">
            Showing <strong className="text-[#2B211D]">{wishlistedProducts.length}</strong> saved saree(s)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
