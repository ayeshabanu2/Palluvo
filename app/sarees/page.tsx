'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SAREE_PRODUCTS, SareeProduct, formatINR } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';

function SareesContent() {
  const searchParams = useSearchParams();

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [selectedFabric, setSelectedFabric] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [silkMarkOnly, setSilkMarkOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Parse URL search params on mount
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);

    const occ = searchParams.get('occasion');
    if (occ) setSelectedOccasion(occ);

    const sort = searchParams.get('sort');
    if (sort) setSortBy(sort);

    const q = searchParams.get('q');
    if (q) setSelectedCategory(q);
  }, [searchParams]);

  // Unique lists for filter options
  const allCategories = useMemo(() => {
    return Array.from(new Set(SAREE_PRODUCTS.map(p => p.sareeType))).sort();
  }, []);

  const allFabrics = useMemo(() => {
    return Array.from(new Set(SAREE_PRODUCTS.map(p => p.fabric))).sort();
  }, []);

  const allOccasions = useMemo(() => {
    return Array.from(new Set(SAREE_PRODUCTS.map(p => p.occasion))).sort();
  }, []);

  const allColors = useMemo(() => {
    const colors: { name: string; hex: string }[] = [];
    SAREE_PRODUCTS.forEach(p => {
      p.swatches.forEach(s => {
        if (!colors.some(c => c.name.toLowerCase() === s.name.toLowerCase())) {
          colors.push({ name: s.name, hex: s.hex });
        }
      });
    });
    return colors;
  }, []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return SAREE_PRODUCTS.filter(product => {
      if (selectedCategory && product.sareeType.toLowerCase() !== selectedCategory.toLowerCase() && product.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (selectedOccasion && product.occasion.toLowerCase() !== selectedOccasion.toLowerCase()) {
        return false;
      }
      if (selectedFabric && !product.fabric.toLowerCase().includes(selectedFabric.toLowerCase())) {
        return false;
      }
      if (selectedColor && !product.swatches.some(s => s.name.toLowerCase() === selectedColor.toLowerCase())) {
        return false;
      }
      if (product.price > maxPrice) {
        return false;
      }
      if (silkMarkOnly && !product.specifications?.care?.includes('Silk') && product.badge !== 'Silk Mark' && !product.fabric.includes('Silk')) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return b.reviewsCount - a.reviewsCount;
      return 0; // default featured
    });
  }, [selectedCategory, selectedOccasion, selectedFabric, selectedColor, maxPrice, silkMarkOnly, sortBy]);

  const activeFiltersCount = [
    selectedCategory,
    selectedOccasion,
    selectedFabric,
    selectedColor,
    silkMarkOnly,
    maxPrice < 15000
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategory('');
    setSelectedOccasion('');
    setSelectedFabric('');
    setSelectedColor('');
    setMaxPrice(15000);
    setSilkMarkOnly(false);
  };

  return (
    <div className="catalog-page">
      {/* 1. TRADITIONAL SAREE SHOWCASE BANNER */}
      <section className="catalog-hero-banner">
        <div className="container">
          <div className="catalog-hero-grid">
            <div className="catalog-hero-text">
              <span className="catalog-hero-eyebrow">ROYAL WEAVING LEGACY</span>
              <h1 className="catalog-hero-title">Traditional Saree Collection</h1>
              <p className="catalog-hero-subtitle">
                Authentic handwoven heirloom drapes sourced directly from master weaver societies across Kanchipuram, Varanasi, Paithan, Pochampally, and Chanderi.
              </p>
              <div className="catalog-trust-tags">
                <span className="tag-chip">✓ 100% Certified Pure Silk</span>
                <span className="tag-chip">✓ Master Handloom Weaves</span>
                <span className="tag-chip">✓ Direct Weaver Clusters</span>
                <span className="tag-chip">✓ Tested Real Gold Zari</span>
              </div>
            </div>

            <div className="catalog-hero-media">
              <div className="catalog-showcase-frame">
                <img
                  src="/images/banner_traditional_saree.jpg"
                  alt="Traditional Royal Kanjivaram Silk Saree"
                  className="catalog-showcase-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                  }}
                />
                <div className="catalog-showcase-caption">
                  <strong>The Royal Kanjivaram</strong> &bull; Pure Crimson Mulberry Silk with Korvai Temple Zari
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATALOG CONTAINER & FILTERS */}
      <div className="container catalog-body-container">
        {/* Top Controls Bar */}
        <div className="catalog-controls-bar">
          <div className="controls-left">
            <button
              type="button"
              className="mobile-filter-trigger"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              FILTERS {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </button>
            <span className="results-count-text">
              Showing <strong>{filteredProducts.length}</strong> authentic saree drapes
            </span>
          </div>

          <div className="controls-right">
            <label htmlFor="catalogSort" className="sort-label">SORT BY:</label>
            <select
              id="catalogSort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="catalog-sort-select"
            >
              <option value="featured">Featured Collection</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">New Arrivals</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="active-filters-chips-bar">
            <span className="active-chips-label">ACTIVE FILTERS:</span>
            {selectedCategory && (
              <span className="filter-pill">
                Category: {selectedCategory}
                <button type="button" onClick={() => setSelectedCategory('')}>&times;</button>
              </span>
            )}
            {selectedOccasion && (
              <span className="filter-pill">
                Occasion: {selectedOccasion}
                <button type="button" onClick={() => setSelectedOccasion('')}>&times;</button>
              </span>
            )}
            {selectedFabric && (
              <span className="filter-pill">
                Fabric: {selectedFabric}
                <button type="button" onClick={() => setSelectedFabric('')}>&times;</button>
              </span>
            )}
            {selectedColor && (
              <span className="filter-pill">
                Color: {selectedColor}
                <button type="button" onClick={() => setSelectedColor('')}>&times;</button>
              </span>
            )}
            {silkMarkOnly && (
              <span className="filter-pill">
                Silk Mark Only
                <button type="button" onClick={() => setSilkMarkOnly(false)}>&times;</button>
              </span>
            )}
            {maxPrice < 15000 && (
              <span className="filter-pill">
                Max: {formatINR(maxPrice)}
                <button type="button" onClick={() => setMaxPrice(15000)}>&times;</button>
              </span>
            )}
            <button type="button" className="clear-all-filters-btn" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          </div>
        )}

        {/* Catalog Main Layout: Sidebar Filters + Products Grid */}
        <div className="catalog-layout">
          {/* Desktop Filter Sidebar */}
          <aside className={`catalog-sidebar ${isMobileFilterOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header-mobile">
              <h3>Filter Sarees</h3>
              <button
                type="button"
                className="sidebar-close-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Saree Type / Category */}
            <div className="filter-group">
              <h4 className="filter-title">Saree Category</h4>
              <div className="filter-options-list">
                <label className="filter-check-item">
                  <input
                    type="radio"
                    name="cat_filter"
                    checked={!selectedCategory}
                    onChange={() => setSelectedCategory('')}
                  />
                  <span>All Categories ({SAREE_PRODUCTS.length})</span>
                </label>
                {allCategories.map(cat => {
                  const count = SAREE_PRODUCTS.filter(p => p.sareeType === cat).length;
                  return (
                    <label key={cat} className="filter-check-item">
                      <input
                        type="radio"
                        name="cat_filter"
                        checked={selectedCategory === cat}
                        onChange={() => setSelectedCategory(cat)}
                      />
                      <span>{cat} ({count})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Occasion */}
            <div className="filter-group">
              <h4 className="filter-title">Occasion</h4>
              <div className="filter-options-list">
                <label className="filter-check-item">
                  <input
                    type="radio"
                    name="occ_filter"
                    checked={!selectedOccasion}
                    onChange={() => setSelectedOccasion('')}
                  />
                  <span>All Occasions</span>
                </label>
                {allOccasions.map(occ => (
                  <label key={occ} className="filter-check-item">
                    <input
                      type="radio"
                      name="occ_filter"
                      checked={selectedOccasion === occ}
                      onChange={() => setSelectedOccasion(occ)}
                    />
                    <span>{occ}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Slider */}
            <div className="filter-group">
              <h4 className="filter-title">Max Price</h4>
              <div className="price-slider-wrap">
                <input
                  type="range"
                  min="3000"
                  max="15000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="price-range-slider"
                />
                <div className="price-slider-labels">
                  <span>₹3,000</span>
                  <span className="current-range-val">{formatINR(maxPrice)}</span>
                </div>
              </div>
            </div>

            {/* Fabric */}
            <div className="filter-group">
              <h4 className="filter-title">Fabric</h4>
              <div className="filter-options-list">
                <label className="filter-check-item">
                  <input
                    type="radio"
                    name="fab_filter"
                    checked={!selectedFabric}
                    onChange={() => setSelectedFabric('')}
                  />
                  <span>All Fabrics</span>
                </label>
                {allFabrics.map(fab => (
                  <label key={fab} className="filter-check-item">
                    <input
                      type="radio"
                      name="fab_filter"
                      checked={selectedFabric === fab}
                      onChange={() => setSelectedFabric(fab)}
                    />
                    <span>{fab}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="filter-group">
              <h4 className="filter-title">Palette Color</h4>
              <div className="filter-color-swatches">
                {allColors.map(c => (
                  <button
                    key={c.name}
                    type="button"
                    className={`filter-swatch-btn ${selectedColor === c.name ? 'is-active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Silk Mark Only */}
            <div className="filter-group">
              <label className="filter-check-item font-semibold">
                <input
                  type="checkbox"
                  checked={silkMarkOnly}
                  onChange={(e) => setSilkMarkOnly(e.target.checked)}
                />
                <span>🎖️ Silk Mark Certified Only</span>
              </label>
            </div>

            {/* Mobile apply button */}
            <div className="sidebar-apply-mobile">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                APPLY FILTERS ({filteredProducts.length})
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="catalog-products-col">
            {filteredProducts.length === 0 ? (
              <div className="catalog-empty-state">
                <div className="empty-icon">🪷</div>
                <h3>No Sarees Matched Your Criteria</h3>
                <p>Try resetting some of your filters to discover our master weaver handlooms.</p>
                <button type="button" className="btn btn-primary" onClick={clearAllFilters}>
                  RESET ALL FILTERS
                </button>
              </div>
            ) : (
              <div className="products-grid catalog-grid">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SareesPage() {
  return (
    <Suspense fallback={<div className="loading-container">Loading PALLUVO Saree Catalog...</div>}>
      <SareesContent />
    </Suspense>
  );
}
