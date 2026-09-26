'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SAREE_PRODUCTS, PALLUVO_TOP_MODELS } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Search } from 'lucide-react';

function SareesContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') || 'All';
  const initialOccasion = searchParams.get('occasion') || 'All';
  const initialBadge = searchParams.get('badge') || '';
  const initialSearch = searchParams.get('q') || '';

  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedOccasion, setSelectedOccasion] = useState(initialOccasion);
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [selectedBadge, setSelectedBadge] = useState(initialBadge);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState(15000);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state whenever URL searchParams change (clicking header buttons, category links, or searching)
  React.useEffect(() => {
    const qType = searchParams.get('type');
    const qOccasion = searchParams.get('occasion');
    const qBadge = searchParams.get('badge');
    const qSearch = searchParams.get('q');

    setSelectedType(qType || 'All');
    setSelectedOccasion(qOccasion || 'All');
    setSelectedBadge(qBadge || '');
    if (qSearch !== null) {
      setSearchQuery(qSearch);
    } else if (!searchParams.has('q')) {
      setSearchQuery('');
    }
  }, [searchParams]);

  // Extract distinct fabrics
  const fabrics = useMemo(() => {
    const set = new Set();
    SAREE_PRODUCTS.forEach(p => {
      if (p.fabric) set.add(p.fabric.split(' ')[0]);
    });
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered & Sorted Sarees
  const filteredSarees = useMemo(() => {
    return SAREE_PRODUCTS.filter((saree) => {
      // Type
      if (selectedType !== 'All') {
        if (selectedType === 'Ready-to-Wear') {
          const isReady =
            saree.category === 'Ready-to-Wear' ||
            saree.sareeType === 'Ready-to-Wear' ||
            saree.sareeType === 'Georgette' ||
            saree.sareeType === 'Nauvari' ||
            (saree.specifications && saree.specifications.weave && saree.specifications.weave.toLowerCase().includes('tissue')) ||
            saree.id === 'saree-012' ||
            saree.id === 'saree-020' ||
            saree.id === 'saree-027';
          if (!isReady) return false;
        } else if (
          saree.sareeType.toLowerCase() !== selectedType.toLowerCase() &&
          saree.category.toLowerCase() !== selectedType.toLowerCase()
        ) {
          return false;
        }
      }
      // Occasion
      if (selectedOccasion !== 'All' && saree.occasion.toLowerCase() !== selectedOccasion.toLowerCase()) {
        return false;
      }
      // Fabric
      if (selectedFabric !== 'All' && !saree.fabric.toLowerCase().includes(selectedFabric.toLowerCase())) {
        return false;
      }
      // Price
      if (saree.price > priceRange) {
        return false;
      }
      // Badge (e.g. New Arrival)
      if (selectedBadge) {
        const badgeNorm = selectedBadge.toLowerCase().replace(/\s+/g, '');
        const sareeBadgeNorm = (saree.badge || '').toLowerCase().replace(/\s+/g, '');
        if (sareeBadgeNorm !== badgeNorm && !sareeBadgeNorm.includes(badgeNorm) && !badgeNorm.includes(sareeBadgeNorm)) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          saree.name.toLowerCase().includes(q) ||
          saree.sareeType.toLowerCase().includes(q) ||
          saree.fabric.toLowerCase().includes(q) ||
          saree.color.toLowerCase().includes(q) ||
          saree.occasion.toLowerCase().includes(q) ||
          (saree.specifications && saree.specifications.origin && saree.specifications.origin.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0; // featured default
    });
  }, [selectedType, selectedOccasion, selectedFabric, selectedBadge, priceRange, searchQuery, sortBy]);

  const clearAllFilters = () => {
    setSelectedType('All');
    setSelectedOccasion('All');
    setSelectedFabric('All');
    setSelectedBadge('');
    setPriceRange(15000);
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title & Editorial Description */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
          The Pure Silk Repertory
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#2B211D]">
          Curated Saree Catalog
        </h1>
        <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
        <p className="text-xs sm:text-sm text-[#6D625D]">
          Explore {SAREE_PRODUCTS.length} signature handloom sarees — 100% pure silk mark guaranteed with complimentary fall and pico finishing.
        </p>
      </div>

      {/* Control Bar: Search, Count, Mobile Filter Button, Sort Dropdown */}
      <div className="bg-white p-4 rounded-xl border border-[#EDE3D5] shadow-xs mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input in catalog */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, color, origin..."
            className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-full pl-10 pr-4 py-2 text-xs text-[#241F1D] focus:outline-none focus:border-[#641C2D]"
          />
          <Search className="w-3.5 h-3.5 text-[#8E857B] absolute left-3.5 top-3" />
        </div>

        {/* Results Counter */}
        <div className="text-xs text-[#8E857B] font-medium">
          Showing <span className="text-[#2B211D] font-bold">{filteredSarees.length}</span> sarees
        </div>

        {/* Mobile filter toggle & Sort */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-4 py-2 bg-[#F8F5EF] border border-[#EDE3D5] rounded-full text-xs font-semibold text-[#2B211D]"
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>

          <div className="flex items-center gap-2 text-xs text-[#6D625D]">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#F8F5EF] border border-[#EDE3D5] rounded-full px-3 py-2 text-xs text-[#2B211D] focus:outline-none font-medium"
            >
              <option value="featured">Featured Collection</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* DESKTOP SIDEBAR FILTERS */}
        <aside className="hidden lg:block space-y-6 bg-white p-6 rounded-xl border border-[#EDE3D5] h-fit sticky top-28 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#EDE3D5]">
            <h3 className="font-serif text-lg font-bold text-[#2B211D] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#B08D57]" /> Filter By
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-[11px] text-[#641C2D] hover:underline font-semibold uppercase tracking-wider"
            >
              Reset
            </button>
          </div>

          {/* Saree Type / Model Filter */}
          <div>
            <label className="block text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2.5">
              Saree Weave / Model
            </label>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedType('All')}
                className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                  selectedType === 'All' ? 'bg-[#641C2D] text-white font-medium' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
                }`}
              >
                All Signature Models
              </button>
              {PALLUVO_TOP_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedType(model.filterType)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition flex items-center justify-between ${
                    selectedType === model.filterType ? 'bg-[#641C2D] text-white font-medium' : 'text-[#6D625D] hover:bg-[#F8F5EF]'
                  }`}
                >
                  <span>{model.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Occasion Filter */}
          <div className="pt-4 border-t border-[#EDE3D5]">
            <label className="block text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2.5">
              Occasion
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Wedding', 'Bridal', 'Festive', 'Party Wear', 'Office Wear', 'Traditional'].map((occ) => (
                <button
                  key={occ}
                  onClick={() => setSelectedOccasion(occ)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    selectedOccasion === occ
                      ? 'bg-[#641C2D] text-white border-[#641C2D]'
                      : 'border-[#EDE3D5] text-[#6D625D] hover:border-[#B08D57]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-[#EDE3D5]">
            <div className="flex justify-between text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2">
              <span>Max Price</span>
              <span className="text-[#641C2D]">₹{priceRange.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="15000"
              step="500"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-[#641C2D] cursor-pointer"
            />
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <div className="lg:col-span-3">
          {/* Active Filter Chips */}
          {(selectedType !== 'All' || selectedOccasion !== 'All' || selectedFabric !== 'All' || selectedBadge || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-[#EDE3D5]">
              <span className="text-xs text-[#8E857B] font-semibold uppercase tracking-wider mr-1">Active:</span>
              {selectedType !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#641C2D]/10 text-[#641C2D] border border-[#641C2D]/30 rounded-full text-xs font-semibold">
                  Model: {selectedType}
                  <button onClick={() => setSelectedType('All')} className="hover:text-black" aria-label="Remove model filter"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedBadge && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B08D57]/15 text-[#8C6A35] border border-[#B08D57]/40 rounded-full text-xs font-semibold">
                  Badge: {selectedBadge}
                  <button onClick={() => setSelectedBadge('')} className="hover:text-black" aria-label="Remove badge filter"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedOccasion !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2B211D]/10 text-[#2B211D] border border-[#2B211D]/30 rounded-full text-xs font-semibold">
                  Occasion: {selectedOccasion}
                  <button onClick={() => setSelectedOccasion('All')} className="hover:text-black" aria-label="Remove occasion filter"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedFabric !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2B211D]/10 text-[#2B211D] border border-[#2B211D]/30 rounded-full text-xs font-semibold">
                  Fabric: {selectedFabric}
                  <button onClick={() => setSelectedFabric('All')} className="hover:text-black" aria-label="Remove fabric filter"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDE3D5] text-[#241F1D] border border-[#B08D57]/30 rounded-full text-xs font-semibold">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-black" aria-label="Remove search filter"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#641C2D] hover:underline font-semibold ml-auto"
              >
                Clear All
              </button>
            </div>
          )}

          {filteredSarees.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-[#EDE3D5]">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-serif text-2xl text-[#2B211D]">No sarees match your filters</h3>
              <p className="text-xs text-[#8E857B] mt-2 mb-6">
                Try loosening your filters or resetting to discover our full catalogue.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-[#641C2D] text-white px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {filteredSarees.map((saree) => (
                <ProductCard key={saree.id} product={saree} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MOBILE FILTER MODAL */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-white h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EDE3D5]">
              <h3 className="font-serif text-xl font-bold">Filter Collection</h3>
              <button onClick={() => setMobileFilterOpen(false)}>
                <X className="w-6 h-6 text-[#2B211D]" />
              </button>
            </div>

            {/* Saree Type */}
            <div>
              <label className="block text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2">
                Saree Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 border border-[#EDE3D5] rounded text-xs"
              >
                <option value="All">All Signature Models</option>
                {PALLUVO_TOP_MODELS.map((m) => (
                  <option key={m.id} value={m.filterType}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Occasion */}
            <div>
              <label className="block text-xs font-bold text-[#2B211D] uppercase tracking-wider mb-2">
                Occasion
              </label>
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value)}
                className="w-full p-2 border border-[#EDE3D5] rounded text-xs"
              >
                {['All', 'Wedding', 'Bridal', 'Festive', 'Party Wear', 'Office Wear', 'Traditional'].map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>

            {/* Max Price */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase mb-2">
                <span>Max Price</span>
                <span>₹{priceRange.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="15000"
                step="500"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#641C2D]"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  clearAllFilters();
                  setMobileFilterOpen(false);
                }}
                className="flex-1 border border-[#EDE3D5] py-2.5 rounded-full text-xs font-semibold uppercase"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 bg-[#641C2D] text-white py-2.5 rounded-full text-xs font-semibold uppercase"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SareesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-serif">Loading signature collection...</div>}>
      <SareesContent />
    </Suspense>
  );
}
