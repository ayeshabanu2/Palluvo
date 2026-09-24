'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { searchProducts, formatINR, SareeProduct } from '@/data/products';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, closeSearch } = useShop();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SareeProduct[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      document.body.classList.add('search-open');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.classList.remove('search-open');
      setQuery('');
      setResults([]);
    }
    return () => document.body.classList.remove('search-open');
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const found = searchProducts(query);
    setResults(found);
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <div className="search-overlay is-open" id="searchOverlay">
      <div className="search-backdrop" onClick={closeSearch} />

      <div className="search-modal">
        <div className="search-modal-header">
          <div className="search-input-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search by weave, fabric, color, or occasion (e.g. Kanjivaram, Crimson, Bridal)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                aria-label="Clear query"
              >
                &times;
              </button>
            )}
          </div>
          <button
            type="button"
            className="search-modal-close"
            onClick={closeSearch}
            aria-label="Close search"
          >
            ESC
          </button>
        </div>

        {/* Quick Links if query is empty */}
        {!query.trim() && (
          <div className="search-suggestions">
            <span className="suggestions-title">POPULAR SEARCHES:</span>
            <div className="suggestions-chips">
              {['Kanjivaram Silk', 'Royal Banarasi', 'Organza Sheer', 'Ready-to-Wear', 'Wedding Sarees', 'Chanderi Tissue'].map(term => (
                <button
                  key={term}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => setQuery(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {query.trim() && (
          <div className="search-results-wrap">
            <div className="search-results-count">
              Found {results.length} authentic {results.length === 1 ? 'saree' : 'sarees'} for “{query}”
            </div>

            {results.length === 0 ? (
              <div className="search-no-results">
                <p>No sarees matched your search. Try searching for &ldquo;Banarasi&rdquo;, &ldquo;Silk&rdquo;, or &ldquo;Festive&rdquo;.</p>
              </div>
            ) : (
              <div className="search-results-grid">
                {results.map(product => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="search-result-card"
                    onClick={closeSearch}
                  >
                    <div className="search-result-thumb">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                        }}
                      />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-cat">{product.sareeType} &bull; {product.fabric}</span>
                      <h4 className="search-result-title">{product.name}</h4>
                      <div className="search-result-pricing">
                        <span className="price-curr">{formatINR(product.price)}</span>
                        {product.compareAtPrice && (
                          <span className="price-orig">{formatINR(product.compareAtPrice)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
