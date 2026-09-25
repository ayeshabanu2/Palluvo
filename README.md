# PALLUVO — Every drape, a little magic.

> **Contemporary Luxury Indian Saree Fashion House & Boutique Atelier**

![Hero Showcase](images/hero_saree_art.jpg)

**PALLUVO** is a contemporary luxury Indian saree fashion house crafted for celebrations, traditions, and the modern muse (*“Every drape, a little magic.”*). Built with strict **100% saree merchandising** (strictly authentic sarees — zero lehengas, kurtis, salwar suits, gowns, or western wear), the platform moves beyond overwhelming 20+ category directories to focus on a curated boutique collection of **the top signature saree models**, honoring India's master artisans with museum-grade digital presentation, intuitive client-side catalog filtering, and a seamless shopping journey.

---

## 🌟 Key Architecture & Highlights

### 1. Brand Identity & Dedicated Saree Navigation
- **Brand Name**: `PALLUVO`
- **Tagline**: *“Every drape, a little magic.”*
- **Main Header Bar**: `PALLUVO` luxury wordmark, full-width instant search bar with live typeahead, and customer action buttons (Account, Wishlist, Cart Drawer with live item counter).
- **Curated Signature Navigation Links**:
  - `NEW ARRIVALS`
  - `KANJIVARAM`
  - `BANARASI`
  - `CHANDERI`
  - `PAITHANI`
  - `ORGANZA`
  - `READY-TO-WEAR`
  - `ALL SAREES`

### 2. Curated Boutique Homepage (`index.html`)
- **"PALLUVO" Editorial Hero Section**:
  - Headline: *"PALLUVO — Every drape, a little magic."*
  - Authentic Silk Mark Certified and Handloom Trust Badges.
  - Action buttons: `EXPLORE TOP MODELS` and `SHOP ALL SAREES`.
  - High-resolution editorial portrait of an authentic crimson & gold bridal drape.
- **"The Festive Edit" Promotional Banner**:
  - Gradient banner with *"UP TO 25% OFF"*, *"FREE SHIPPING ON ORDERS ABOVE ₹999"*, and direct promo link.
- **"The Top Saree Models" (Curated 6 Signature Drapes)**:
  1. **The Royal Kanjivaram** (Kanchipuram, Tamil Nadu) — 180+ Weaving Hours, Pure Mulberry Silk & Korvai Gold Temple Zari
  2. **The Heirloom Banarasi** (Varanasi, UP) — 210+ Weaving Hours, Pure Katan Silk with Real Zari Jaal
  3. **The Whispering Chanderi** (Chanderi, MP) — 95+ Weaving Hours, Gossamer Handloom Silk-Cotton Tissue
  4. **The Imperial Paithani** (Paithan, Maharashtra) — 160+ Weaving Hours, Kaleidoscopic Mor Bangdi Peacock Pallu
  5. **The Ethereal Organza** (Couture Atelier) — 75+ Embroidery Hours, Scalloped Hand-Embroidered Zardozi Sheer
  6. **The 1-Minute Ready Drape** (Signature Studio) — Pre-Pleated Tailored Pure Silk Drape for 60-second glamour
- **"Shop By Occasion" (Curated Collections)**:
  - Wedding, Bridal, Festive, Party Wear, Office Wear, Casual, Traditional, and Reception with curated recommendations.
- **"Trending Now" (12 Saree Products)**:
  - 12 sarees with INR pricing, compare-at pricing, discount percentages, star ratings, live color swatches, wishlist toggles, quick view, and one-click Add to Bag.
- **"The Handloom Edit"**:
  - Subtitle: *"Crafted by tradition. Woven for today."*
  - Highlighting 10 authentic weaving clusters: Varanasi, Kanchipuram, Paithan, Sualkuchi, Chanderi, Pochampally, Patan, Kota, Uppada, and Maheshwar.
- **"Navratri In Motion" Festive Spotlight**:
  - High-impact visual banner: *"Celebrate every twirl."* with festive styling and direct link to festive drapes.
- **5 Core Trust Pillars**:
  1. *Authentic Weaves* (Direct from master artisan clusters)
  2. *Quality Assured* (100% Silk Mark certified purity)
  3. *Secure Payments* (256-bit SSL encryption, UPI, Cards, NetBanking, COD)
  4. *Easy Returns* (Hassle-free 7-day pickup guarantee)
  5. *Fast Delivery* (Express insured dispatched across India & Worldwide)
- **Footer**:
  - Comprehensive customer care links, Saree Type quick links, regional cluster guide, trust badges, payment icons (UPI, RuPay, Visa, Mastercard, NetBanking, COD), and newsletter subscription (*"Join the Saree Circle"*).

---

## 🛍️ Secondary Pages & Functionality

1. **Saree Catalog & Filters (`sarees.html`)**:
   - Multi-facet client-side filter engine (Saree Type, Fabric, Occasion, Regional Cluster, Price Range slider, Color swatches, and Sorting).
   - Zero page reload instant updates with active tag chips and "Clear All".

2. **Product Detail Page (`product.html`)**:
   - Detailed Indian saree specifications:
     - Total Length: **5.5 meters saree + 0.8 meter unstitched blouse piece**
     - Weave Type & Artisan Cluster Origin
     - Zari Composition & Fabric Purity
     - Care Instructions: Dry clean only
   - Interactive photo gallery with zoom and thumbnail navigation.
   - Live Indian Pincode delivery estimator with dispatch calculation.
   - Accordions for Draping Guide, Weaver Story, Fabric Care, and Shipping & Returns.

3. **Cart & Slide-Out Drawer (`cart.html`)**:
   - Dynamic free-shipping meter (₹999 threshold).
   - Quantity adjustment, coupon codes (`FESTIVE25`, `SAREE10`), and gift-wrapping options.

4. **Streamlined Checkout (`checkout.html`)**:
   - Full support for Indian payment methods: UPI (PhonePe, GPay, Paytm with instant QR simulator and VPA input), Credit/Debit cards, NetBanking, and Cash on Delivery.
   - Secure order confirmation and generation of order receipt tracking.

5. **Customer Account & Tracking (`account.html`)**:
   - Real-time order progress timeline (*Confirmed → Handloom QC → Dispatched → Delivered*).
   - Saved delivery addresses and styling preferences.

6. **Customer Wishlist (`wishlist.html`)**:
   - Persistent wishlist with 1-click move to shopping bag.

7. **Brand & Weaver Story (`about.html`)**:
   - Heritage manifesto detailing artisan preservation, fair-trade weaver wages, and Silk Mark certification.

---

## 📁 Repository Structure

```
├── index.html            # Homepage (Hero, Top Models, 8 Occasions, 25 Products, Handlooms)
├── sarees.html           # Multi-filter Saree Catalog (Full-Bleed Luxury Hero + 25 Handlooms)
├── product.html          # Product Detail Page with authentic 5.5m+0.8m specs
├── cart.html             # Cart Page & Drawer state
├── checkout.html         # Secure Indian payment checkout
├── wishlist.html         # Customer saved sarees
├── account.html          # Order tracking & account portal
├── about.html            # Brand & Artisan heritage story
├── contact.html          # Luxury Atelier & Concierge Hub (+91 84988 54323)
├── public/
│   └── images/           # All 84 Authentic Luxury Saree Image Assets
├── src/
│   ├── app/              # Next.js App Router (layout, page, sarees, product/[slug], cart, checkout, etc.)
│   ├── components/       # React Components (Header, Footer, ProductCard, CartDrawer, QuickViewModal, Toast)
│   ├── context/          # StoreContext for Cart, Wishlist, and Coupons
│   ├── data/             # Saree Catalog & Models dataset (29 Heirloom & Collector Sarees)
│   └── utils/            # Currency and helper formatters
├── next.config.js        # Next.js Configuration
├── jsconfig.json         # Module Path Aliases (@/*)
├── package.json          # Next.js, React, Tailwind CSS, Lucide dependencies
└── README.md             # Platform Documentation
```

---

## 🚀 Running Locally

To run the Next.js development server:
```bash
npm run dev
```
Navigate to `http://localhost:3000/` in your browser.

To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 🛠️ Technologies

- **Next.js 15 (App Router)**: Server & Client Components, Dynamic Routing, Metadata API.
- **React 19**: Modern declarative UI with Hooks and Context API for global state.
- **Tailwind CSS 4**: Modern utility-first CSS paired with bespoke luxury Indian aesthetic tokens.
- **Lucide React**: Crisp, modern stroke icons.
- **Local State Persistence**: `localStorage` synchronized state for Cart, Wishlist, Coupons, and Addresses.

