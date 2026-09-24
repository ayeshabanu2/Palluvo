'use client';

import React from 'react';
import Link from 'next/link';
import {
  PALLUVO_TOP_MODELS,
  FESTIVE_SAREES,
  SAREE_OCCASIONS,
  SAREE_PRODUCTS,
  HANDLOOM_REGIONS
} from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';

export default function HomePage() {
  const trendingSarees = [SAREE_PRODUCTS[4], SAREE_PRODUCTS[1], SAREE_PRODUCTS[0], SAREE_PRODUCTS[13]];
  const newArrivals = [SAREE_PRODUCTS[12], SAREE_PRODUCTS[14], SAREE_PRODUCTS[15], SAREE_PRODUCTS[16]];
  const bestsellers = [SAREE_PRODUCTS[9], SAREE_PRODUCTS[5], SAREE_PRODUCTS[8], SAREE_PRODUCTS[19]];

  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="hero-art-section" id="heroSaree">
        <div className="hero-art-scrim" />
        <div className="hero-art-container">
          <div className="hero-art-content">
            <span className="hero-art-eyebrow">HANDCRAFTED LUXURY WEAVES</span>
            <h1 className="hero-art-title">PALLUVO</h1>
            <p className="hero-art-subtitle">Every drape, a little magic.</p>
            <p className="hero-art-body">
              Discover our handpicked signature saree models, crafted by master artisans for celebrations, traditions, and the modern muse. Pure certified silks, tested real zari, and timeless elegance in every fold.
            </p>
            <div className="hero-art-actions">
              <a href="#signatureModels" className="btn btn-primary hero-btn">
                EXPLORE TOP MODELS
              </a>
              <Link href="/sarees" className="btn btn-secondary hero-btn">
                SHOP ALL SAREES
              </Link>
            </div>
            <div className="hero-art-badges">
              <span className="hero-trust-badge">
                <span className="trust-icon">🎖️</span> Silk Mark Certified
              </span>
              <span className="hero-trust-badge">
                <span className="trust-icon">🏺</span> 100% Handloom Trust
              </span>
              <span className="hero-trust-badge">
                <span className="trust-icon">✨</span> Direct Artisan Fair-Wage
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS BAR */}
      <section className="value-props-bar">
        <div className="container">
          <div className="value-props-flex">
            <div className="value-prop-card">
              <span className="prop-icon">🏛️</span>
              <div className="prop-detail">
                <h4>Authentic Weaves</h4>
                <p>Preserving 600+ years of regional handloom heritage</p>
              </div>
            </div>
            <div className="value-prop-card">
              <span className="prop-icon">🧵</span>
              <div className="prop-detail">
                <h4>5.5m Saree + 0.8m Blouse</h4>
                <p>Standard generous cut with complimentary fall &amp; pico</p>
              </div>
            </div>
            <div className="value-prop-card">
              <span className="prop-icon">⚡</span>
              <div className="prop-detail">
                <h4>Instant Dispatch</h4>
                <p>Ships within 24 hours via express insured air courier</p>
              </div>
            </div>
            <div className="value-prop-card">
              <span className="prop-icon">💬</span>
              <div className="prop-detail">
                <h4>Stylist Concierge</h4>
                <p>Direct WhatsApp draping consultation &amp; bridal guidance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CURATED SIGNATURE TOP MODELS */}
      <section className="section signature-models-section" id="signatureModels">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">THE ARCHIVE</span>
            <h2 className="section-title">The Top Saree Models</h2>
            <p className="section-subtitle">
              Carefully curated signature drapes representing the highest pinnacle of Indian textile mastery.
            </p>
          </div>

          <div className="models-grid" id="sareeCategoriesGrid">
            {PALLUVO_TOP_MODELS.map((model) => (
              <div key={model.id} className="saree-cat-card">
                <Link href={`/sarees?category=${encodeURIComponent(model.filterType)}`} className="cat-card-media-wrap">
                  <img
                    src={model.image}
                    alt={model.name}
                    className="saree-cat-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                    }}
                  />
                  <div className="cat-card-overlay-tag">
                    <span>{model.tag}</span>
                    <span className="cat-hours-badge">{model.artisanHours}</span>
                  </div>
                </Link>

                <div className="saree-cat-info">
                  <div className="cat-header-row">
                    <span className="saree-cat-region">{model.region}</span>
                    {model.pureSilkMark && (
                      <span className="silk-mark-pill">Silk Mark</span>
                    )}
                  </div>
                  <h3 className="saree-cat-name">
                    <Link href={`/sarees?category=${encodeURIComponent(model.filterType)}`}>
                      {model.name}
                    </Link>
                  </h3>
                  <p className="saree-cat-oneliner">{model.oneLiner}</p>
                  <p className="saree-cat-subtitle">{model.subtitle}</p>
                  <Link
                    href={`/sarees?category=${encodeURIComponent(model.filterType)}`}
                    className="saree-cat-link"
                  >
                    EXPLORE COLLECTION &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE FESTIVE EDIT PROMOTIONAL BANNER */}
      <section className="festive-banner-section">
        <div className="container">
          <div className="festive-banner-box">
            <div className="festive-banner-content">
              <span className="festive-eyebrow">LIMITED FESTIVE PRIVILEGE</span>
              <h2 className="festive-title">The Festive Edit — Celebrate in Pure Silk</h2>
              <p className="festive-desc">
                From Navratri twirls to Diwali pujas and royal wedding receptions, explore authentic handwoven silks infused with auspicious reds, royal purples, and tested gold zari.
              </p>
              <div className="festive-coupon-box">
                <span>Use Code:</span>
                <span className="coupon-code-tag">FESTIVE25</span>
                <span>for 25% OFF above ₹3,999</span>
              </div>
              <div className="festive-actions">
                <Link href="/sarees?occasion=Festive" className="btn btn-primary">
                  SHOP FESTIVE SAREES &rarr;
                </Link>
              </div>
            </div>

            <div className="festive-sarees-grid">
              {FESTIVE_SAREES.map((f, i) => (
                <Link key={i} href={`/sarees?category=${encodeURIComponent(f.name.split(' ')[0])}`} className="festive-mini-card">
                  <img
                    src={f.image}
                    alt={f.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                    }}
                  />
                  <div className="mini-card-text">
                    <strong>{f.name}</strong>
                    <span>{f.region}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SHOP BY OCCASION */}
      <section className="section occasions-section" id="occasionsSection">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">CURATED PALETTES</span>
            <h2 className="section-title">Shop by Occasion</h2>
            <p className="section-subtitle">
              Whether walking down the aisle, hosting a festive gathering, or making an effortless evening entrance.
            </p>
          </div>

          <div className="occasions-grid" id="sareeOccasionsGrid">
            {SAREE_OCCASIONS.map((occ) => (
              <Link
                key={occ.id}
                href={`/sarees?occasion=${encodeURIComponent(occ.filterParam)}`}
                className="saree-occ-card"
              >
                <img
                  src={occ.image}
                  alt={`${occ.name} Sarees`}
                  className="saree-occ-bg"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                  }}
                />
                <div className="saree-occ-scrim" />
                <div className="saree-occ-content">
                  <span className="saree-occ-tag">{occ.sareeType}</span>
                  <h3 className="saree-occ-name">{occ.name}</h3>
                  <p className="saree-occ-sub">{occ.subtitle}</p>
                  <span className="saree-occ-link">EXPLORE SAREES &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TRENDING NOW PRODUCTS */}
      <section className="section trending-section" id="trendingSection">
        <div className="container">
          <div className="section-head-split">
            <div>
              <span className="section-eyebrow">COUTURE ATELIER</span>
              <h2 className="section-title">Trending Drapes</h2>
            </div>
            <Link href="/sarees" className="view-all-link">
              VIEW ALL SAREES &rarr;
            </Link>
          </div>

          <div className="products-grid" id="trendingProductsGrid">
            {trendingSarees.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. THE HANDLOOM EDIT: REGIONAL CLUSTERS */}
      <section className="section handloom-section" id="handloomClusters">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">GEOGRAPHICAL INDICATIONS</span>
            <h2 className="section-title">The Handloom Edit</h2>
            <p className="section-subtitle">
              Crafted by tradition. Woven for today. Honoring India&apos;s celebrated weaving geography.
            </p>
          </div>

          <div className="handloom-scroll-wrap">
            <div className="handloom-scroll-grid" id="handloomRegionsScroll">
              {HANDLOOM_REGIONS.map((reg) => (
                <Link
                  key={reg.name}
                  href={`/sarees?category=${encodeURIComponent(reg.name)}`}
                  className="handloom-region-chip"
                >
                  <img
                    src={reg.image}
                    alt={`${reg.name} Handloom`}
                    className="region-chip-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                    }}
                  />
                  <h4 className="region-chip-name">{reg.name}</h4>
                  <div className="region-chip-state">{reg.state}</div>
                  <div className="region-chip-weave">{reg.weave}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. NAVRATRI IN MOTION FESTIVE SPOTLIGHT */}
      <section className="navratri-spotlight-section">
        <div className="container">
          <div className="navratri-banner-card">
            <div className="navratri-text-wrap">
              <span className="navratri-eyebrow">FESTIVE CELEBRATION</span>
              <h2 className="navratri-title">Navratri in Motion — Celebrate Every Twirl</h2>
              <p className="navratri-desc">
                Rich Bandhani dots, mathematical Patola ikat geometries, and fluid georgettes tailored for nine nights of devotion, music, and dance.
              </p>
              <div className="navratri-actions">
                <Link href="/sarees?occasion=Festive" className="btn btn-primary">
                  EXPLORE FESTIVE COLLECTION &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. BESTSELLERS */}
      <section className="section bestsellers-section">
        <div className="container">
          <div className="section-head-split">
            <div>
              <span className="section-eyebrow">PATRON FAVORITES</span>
              <h2 className="section-title">Heirloom Bestsellers</h2>
            </div>
            <Link href="/sarees?sort=rating" className="view-all-link">
              DISCOVER HIGH-RATED &rarr;
            </Link>
          </div>

          <div className="products-grid" id="bestsellersGrid">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 10. COMMUNITY & ATELIER MUSE */}
      <section className="section instagram-muse-section">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">COMMUNITY SPOTLIGHT</span>
            <h2 className="section-title">The #PalluvoMuse Gallery</h2>
            <p className="section-subtitle">
              Real women. Timeless drapes. Cherished celebrations across the world.
            </p>
          </div>

          <div className="muse-grid">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="muse-tile">
                <img
                  src={`/images/insta_${num}.jpg`}
                  alt={`PALLUVO Muse ${num}`}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                  }}
                />
                <div className="muse-hover-overlay">
                  <span>@palluvo</span>
                  <p>“Every drape, a little magic.”</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
