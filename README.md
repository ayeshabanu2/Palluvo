# SAREE.COM — Authentic Handcrafted Indian Sarees

> **Timeless weaves. Modern elegance. 100% Curated Indian Sarees.**

![Hero Showcase](images/hero_saree_art.jpg)

**SAREE.COM** is a dedicated luxury Indian saree e-commerce platform crafted for celebrations, traditions, and everyday elegance. Built with strict **100% saree merchandising** (exclusively authentic sarees — zero lehengas, kurtis, salwar suits, gowns, or western wear), the platform honors India's master weavers with museum-grade digital presentation, intuitive client-side catalog filtering, and a seamless shopping journey.

---

## 🌟 Key Architecture & Highlights

### 1. Dedicated Saree-Only Navigation
- **Top Announcement Bar**: Festive updates (*"FREE SHIPPING ON ORDERS ABOVE ₹999 | 100% AUTHENTIC WEAVES"*), India Delivery selector, and 24/7 Concierge Support.
- **Main Header Bar**: `SAREE.COM` luxury wordmark, full-width instant search bar with live typeahead, and customer action buttons (Account, Wishlist, Cart Drawer with live item counter).
- **Primary 9-Link Saree Navigation**:
  - `NEW ARRIVALS`
  - `BANARASI`
  - `KANJIVARAM`
  - `SILK SAREES`
  - `HANDLOOM`
  - `COTTON`
  - `PARTY WEAR`
  - `WEDDING`
  - `ALL SAREES`

### 2. Homepage Experience (`index.html`)
- **"The Art of the Saree" Hero Section**:
  - Editorial headline: *"Timeless weaves. Modern elegance."*
  - Authentic Silk Mark Certified and Handloom Trust Badges.
  - Action buttons: `SHOP SAREES` and `EXPLORE HANDLOOMS`.
  - High-resolution editorial portrait of an authentic crimson & gold bridal drape.
- **"The Festive Edit" Promotional Banner**:
  - Gradient banner with *"UP TO 25% OFF"*, *"FREE SHIPPING ON ORDERS ABOVE ₹999"*, and direct promo link.
- **"Shop By Saree Type" (All 27 Specified Regional & Fabric Categories)**:
  - Banarasi, Kanjivaram, Paithani, Mysore Silk, Chanderi, Tussar, Gadwal, Pochampally, Uppada, Assam / Muga Silk, Patola, Bandhani, Leheriya, Kalamkari, Ilkal, Chikankari, Bomkai, Phulkari, Nauvari, Georgette, Chiffon, Cotton, Crepe, Organza, Net, Ready-to-Wear, and Handloom.
  - Each category card includes an authentic high-resolution saree image, region badge, description, and direct filter link.
- **"Shop By Occasion" (8 Curated Collections)**:
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
├── index.html            # Homepage (Hero, 27 Categories, 8 Occasions, 12 Products, Handlooms)
├── sarees.html           # Multi-filter Saree Catalog
├── product.html          # Product Detail Page with authentic 5.5m+0.8m specs
├── cart.html             # Cart Page & Drawer state
├── checkout.html         # Secure Indian payment checkout
├── wishlist.html         # Customer saved sarees
├── account.html          # Order tracking & account portal
├── about.html            # Brand & Artisan heritage story
├── css/
│   └── style.css         # Complete Luxury Design System & Component Styles
├── js/
│   ├── products.js       # 27 Categories, 8 Occasions, 12 Products, 10 Loom Clusters
│   └── store.js          # Cart, Wishlist, Search, Modals, Toasts, Checkout logic
├── images/
│   ├── categories/       # 27 Regional & Fabric Saree Category Photography
│   ├── occasions/        # 8 Saree Occasion Photography Assets
│   ├── hero_saree_art.jpg# Master 16:9 Art of the Saree Hero Image
│   └── *.jpg, *.png      # Additional Curated Editorial Saree Assets
├── server.ps1            # Lightweight Local HTTP Dev Server
└── README.md             # Platform Documentation
```

---

## 🚀 Running Locally

To run the lightweight PowerShell server locally:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```
Navigate to `http://localhost:3000/` in your browser.

---

## 🛠️ Technologies

- **HTML5**: Semantic tags, ARIA accessibility, rich snippet structured data.
- **Vanilla CSS3**: Custom design tokens, luxury typography, fluid CSS Grid, Flexbox, responsive breakpoints.
- **Vanilla JavaScript (ES6+)**: `localStorage` persistent state management, dynamic DOM rendering, debounce live search, and modal workflows.

