'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* 1. HERO STORY SECTION */}
      <section className="about-hero-section">
        <div className="container">
          <div className="about-hero-content text-center">
            <span className="section-eyebrow">THE PALLUVO MANIFESTO</span>
            <h1 className="about-hero-title">Every drape, a little magic.</h1>
            <p className="about-hero-lead">
              We founded PALLUVO to honor India&apos;s master textile artisans, celebrating six centuries of unbroken handloom genius with a museum-grade digital atelier for the contemporary muse.
            </p>
          </div>
        </div>
      </section>

      {/* 2. EDITORIAL PHOTO STORY */}
      <section className="about-image-story-section">
        <div className="container">
          <div className="about-split-grid">
            <div className="about-image-wrap">
              <img
                src="/images/craftsmanship.jpg"
                alt="Master Weaver on Traditional Pit Loom"
                className="about-feature-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/hero_saree_art.jpg';
                }}
              />
              <div className="about-image-caption">
                Master artisan Govind Das at his pit loom in Varanasi, weaving a real gold zari kadhwa jaal.
              </div>
            </div>

            <div className="about-text-wrap">
              <span className="section-eyebrow">ANCIENT CRAFT, CONTEMPORARY POISE</span>
              <h2 className="about-subheading">Why 100% Saree Merchandising Matters</h2>
              <p className="about-p">
                In an era dominated by fast fashion and fleeting silhouettes, the Indian saree remains unmatched in grace. Six yards of unstitched poetry that breathes, adapts, and transforms with every fold.
              </p>
              <p className="about-p">
                At PALLUVO, we consciously rejected the temptation to become a cluttered clothing bazaar. We sell strictly, authentically, and proudly <strong>sarees only</strong>. Every artisan hour, every pure silk yarn, and every tested zari wire is dedicated to perfecting the drape.
              </p>

              <div className="about-stats-grid">
                <div className="stat-card">
                  <span className="stat-number">180+</span>
                  <span className="stat-label">Average Weaving Hours per Saree</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">10</span>
                  <span className="stat-label">Protected GI Handloom Clusters</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Silk Mark Certified Pure Natural Silk</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">0%</span>
                  <span className="stat-label">Synthetic Blends or Machine Imitations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR CORE HERITAGE PILLARS */}
      <section className="section about-pillars-section" id="purity">
        <div className="container">
          <div className="section-head text-center">
            <span className="section-eyebrow">OUR COMMITMENT</span>
            <h2 className="section-title">The Four PALLUVO Guarantees</h2>
          </div>

          <div className="heritage-pillars-grid">
            <div className="heritage-pillar-card">
              <span className="pillar-num">01</span>
              <h3>Silk Mark Certified Purity</h3>
              <p>
                Every single silk saree carries an individual Silk Mark tag with a unique tamper-evident verification number from the Silk Mark Organisation of India, certifying 100% natural silk threads.
              </p>
            </div>

            <div className="heritage-pillar-card">
              <span className="pillar-num">02</span>
              <h3>Direct Weaver Co-Operatives</h3>
              <p>
                We bypass exploitative middleman networks, directing 78% of retail earnings directly into master weaver clusters in Kanchipuram, Varanasi, Paithan, and Pochampally to sustain traditional loom families.
              </p>
            </div>

            <div className="heritage-pillar-card">
              <span className="pillar-num">03</span>
              <h3>The 5.5m + 0.8m Standard</h3>
              <p>
                Zero compromises on yardage. Every saree is cut with a full 5.5-meter body and includes a separate 0.8-meter matching or contrast unstitched pure silk blouse piece, complete with complimentary fall and pico edging.
              </p>
            </div>

            <div className="heritage-pillar-card">
              <span className="pillar-num">04</span>
              <h3>Tested Gold &amp; Silver Zari</h3>
              <p>
                Our zari is tested for authentic metallic content — electroplated silver and real tested gold threads that do not tarnish or discolor with age, allowing your drape to become an heirloom passed across generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ATELIER INVITATION */}
      <section className="about-atelier-cta-section">
        <div className="container">
          <div className="atelier-invite-box">
            <div className="invite-content">
              <span className="section-eyebrow">VISIT OUR ATELIER</span>
              <h2 className="invite-title">Experience the Magic in Hyderabad</h2>
              <p className="invite-desc">
                Immerse yourself in sensory silk textures, drape rare museum pieces, and enjoy personalized bridal trousseau consultations with our master stylists at our flagship Hyderabad atelier.
              </p>
              <div className="invite-contact-info">
                <p>📍 Kavuri Hills Road, Madhapur, Hitech City, Hyderabad, Telangana 500081</p>
                <p>📞 Concierge: +91 84988 54323 &bull; Mon–Sat: 10:00 AM – 8:00 PM IST</p>
              </div>
              <div className="invite-actions">
                <Link href="/contact" className="btn btn-primary">
                  BOOK A STYLIST APPOINTMENT &rarr;
                </Link>
                <Link href="/sarees" className="btn btn-secondary">
                  EXPLORE ARCHIVE ONLINE
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
