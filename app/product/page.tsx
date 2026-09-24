'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlugOrId, SAREE_PRODUCTS } from '@/data/products';

function ProductRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get('id') || searchParams.get('slug');
    if (id) {
      const product = getProductBySlugOrId(id);
      if (product) {
        router.replace(`/product/${product.slug}`);
        return;
      }
    }
  }, [searchParams, router]);

  return (
    <div className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>
        Discover PALLUVO Sarees
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Explore our curated collection of authentic Indian handloom sarees.
      </p>
      <Link href="/sarees" className="btn btn-primary">
        EXPLORE ALL SAREES &rarr;
      </Link>
    </div>
  );
}

export default function ProductIndexPage() {
  return (
    <Suspense fallback={<div className="loading-container">Locating Saree...</div>}>
      <ProductRedirectContent />
    </Suspense>
  );
}
