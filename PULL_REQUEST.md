# Pull Request: PALLUVO Next.js (React) Tech Stack Migration & Luxury Saree Experience

**PR Title:** `feat(stack): migrate storefront to Next.js App Router (React) with Tailwind CSS and full e-commerce suite`  
**Base Branch:** `main`  
**Status:** `READY TO MERGE` | **Target Branch:** `main` | **Last Updated:** `2026-09-28`

---

## 📌 Executive Summary

This pull request transitions **PALLUVO — Contemporary Luxury Indian Saree Fashion House & Boutique Atelier** from a multi-page static HTML/Vanilla JS codebase into a modern, production-grade **Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + Lucide Icons** web application.

The migration preserves strict **100% saree-only merchandising**, all authenticated artisan imagery, custom blouse tailoring workflows, and verified customer concierge channels while dramatically improving client-side responsiveness, modularity, and SEO capabilities.

**Latest revisions** resolve reviewer accessibility findings on product cards: adding keyboard `focus-within` and touch-visible overlay interactions for quick actions (`ProductCard.js`), expanding wishlist controls to compliant ≥44×44px hit areas with dynamic, product-specific `aria-label` and `aria-pressed` states (`ProductCard.js`, `QuickViewModal.js`, `product/[slug]/page.js`), validating high-contrast text ratios across all surfaces (5.79:1 badge, 5.84:1 secondary copy, 7.32:1 dark footer copy), and maintaining a clean PostCSS pipeline with 100% route verification.

---

## 🌟 Key Architecture & Stack Highlights

### 1. Technology Stack Modernization
- **Framework:** Next.js 15 (App Router with nested server & client components)
- **UI & Logic:** React 19 with custom hooks and persistent Context API
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss` with custom luxury tokens (Deep Burgundy `#641C2D`, Antique Gold `#B08D57`, Warm Ivory `#F8F5EF`, Dark Brown `#2B211D`)
- **CSS Pipeline:** `postcss.config.mjs` → `@tailwindcss/postcss` → full 47 KB utility bundle
- **Iconography:** Lucide React icons
- **State Persistence:** LocalStorage-backed cart, wishlist, and promotional discount state

### 2. Full Application Suite Routes
- `/` — Curated boutique homepage with editorial hero, 6 signature saree models, limited festive banner, trending carousel, and handloom craft storytelling.
- `/sarees` — Complete 25-saree luxury catalog with real-time weave filtering, occasion selectors, price slider, live text search, and multi-parameter sorting.
- `/product/[slug]` — High-resolution dynamic product detail page with image gallery viewer, color swatches, 4-tier blouse tailoring selector, full weave specifications, and recommendation engine.
- `/cart` & `/checkout` — Full shopping bag drawer & standalone cart, promo code verification (`PALLUVO10`, `FIRSTDRAPE`), free shipping threshold progress bar, and 3-step checkout with instant order generation.
- `/wishlist` — Persistent saved favorites gallery with one-click move to bag.
- `/about` — Editorial atelier story honoring India's master weavers and Silk Mark certification.
- `/contact` — Concierge hub with verified contact channels (`contact@palluvo.com`, `+91 84988 54323`, `+91 81067 89789`) and interactive consultation form.
- `/account` — Customer order history, privilege status (*Silk Circle Gold*), and delivery address management.

---

## 📋 Migration & Implementation Matrix

| Component / Layer | Previous Stack | New Next.js Stack | Impacted Files | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Framework & Engine** | Multi-page static HTML | Next.js 15 App Router | [`package.json`](package.json), [`next.config.js`](next.config.js), [`jsconfig.json`](jsconfig.json) | Full compilation pipeline with `@/*` aliases and production build optimizations. |
| **PostCSS Pipeline** | _(absent)_ | `postcss.config.mjs` → `@tailwindcss/postcss` | [`postcss.config.mjs`](postcss.config.mjs) | **New file.** Without this, Next.js skipped the PostCSS transform; stylesheet was 22 KB of CSS variables only. With it, the emitted bundle is 47 KB (prod) / 61 KB (dev) and includes every utility class. |
| **Global Shell & Meta** | Separate `<head>` tags | Next.js Root Layout & Metadata API | [`src/app/layout.js`](src/app/layout.js), [`src/app/globals.css`](src/app/globals.css) | Centralized typography loading (Alex Brush, Cormorant Garamond, Playfair Display, Plus Jakarta Sans) and responsive layout. |
| **Global State** | `store.js` DOM manipulation | `StoreProvider` React Context | [`src/context/StoreContext.js`](src/context/StoreContext.js) | Reactive state for shopping bag, wishlist, promo codes, drawer visibility, quick-view modal, and toast alerts. |
| **Homepage** | `index.html` | Next.js Page Component | [`src/app/page.js`](src/app/page.js) | Editorial hero, signature models, festive promo with direct coupon copy, and artisan craft highlights. |
| **Product Catalog** | `sarees.html` | Dynamic Filtered React View | [`src/app/sarees/page.js`](src/app/sarees/page.js) | Live client-side filtering by weave type, occasion, fabric, price range, and search query. |
| **Product Detail** | `product.html` | Dynamic Route `[slug]` | [`src/app/product/[slug]/page.js`](src/app/product/%5Bslug%5D/page.js) | Dynamic routing supporting all 25 saree slugs with custom blouse stitching add-on calculation. |
| **Cart & Checkout** | `cart.html`, `checkout.html` | Next.js Page Components | [`src/app/cart/page.js`](src/app/cart/page.js), [`src/app/checkout/page.js`](src/app/checkout/page.js) | Reactive cart calculations, promo code validations, and seamless order confirmation. |
| **Components** | Static DOM elements | Reusable React Components | [`src/components/*`](src/components/) | `Header.js`, `Footer.js`, `ProductCard.js`, `CartDrawer.js`, `QuickViewModal.js`, `Toast.js`. |
| **Asset Pipeline** | Loose `/images/` | Next.js Static `/public/images/` | [`public/images/`](public/images/) | All authentic luxury saree assets migrated to public folder for zero-latency CDN serving. |
| **Desktop Nav Alignment** | Multi-line wrap at 1265px | Strict single-line, 72px header | [`postcss.config.mjs`](postcss.config.mjs), [`src/app/globals.css`](src/app/globals.css), [`src/components/Header.js`](src/components/Header.js) | Three-layer fix: (1) PostCSS now emits all utility classes; (2) nav uses `flex-nowrap overflow-x-auto` + `whitespace-nowrap shrink-0` on every `<Link>`; (3) CSS attribute-selector fallback rules in `globals.css` hard-stop any wrap. Header main row locked at 72px via `h-[72px]` + `.header-main-row`. |
| **Top Category Nav Reactivity** | Stale state on route changes | Synchronized `useSearchParams()` with state + active indicators | [`src/app/sarees/page.js`](src/app/sarees/page.js), [`src/components/Header.js`](src/components/Header.js) | Live filter reactivity across all 8 category buttons, badges, and search queries; active indicator styling; removable filter chips. |
| **Mobile Menu Toggle** | Hidden at mobile widths | Visible `#mobileMenuToggle` & `#mobileMenuDrawer` | [`src/components/Header.js`](src/components/Header.js) | Removed inline `display:none`; exposed `#mobileMenuToggle` across mobile breakpoints down to 320px with smooth drawer interaction. |
| **Occasion Saree Audit** | Western gown on Party Wear | 100% Authentic Indian Sarees | [`public/images/occasions/*`](public/images/occasions/) | Replaced evening gown with sheer black cocktail saree; audited all 8 occasion cards with verified authentic drapes. |
| **[P1] Narrow Mobile Viewport Control Clipping** | Shopping-bag control clipped at ~365px, announcement & tagline wrapping awkwardly | Adapted header layout for 360–375px viewports: responsive paddings, min-width containment, truncated tagline & compact announcement with zero clipping | [`src/components/Header.js`](src/components/Header.js), [`src/app/globals.css`](src/app/globals.css) | Actions cluster uses compact gap (`gap-1 sm:gap-4`) and padding (`px-2.5 sm:px-4`); logo container uses `flex-1 min-w-0` to avoid pushing right actions; announcement bar has `overflow-hidden whitespace-nowrap` + compact text; header height adapts cleanly (64px mobile / 72px desktop). |
| **[P2] Hero trust-badge copy** | `"Direct Master Weaver Clustered"` (grammatically incomplete) | `"Direct from master weavers"` | [`src/app/page.js`](src/app/page.js) | Corrected trust-badge fragment in hero section line 80 to clean, natural phrasing. |
| **[P2] “Explore Top Models” Anchor Scroll Offset** | Sticky header occluded section eyebrow and title on arrival | Added scroll margin offset (`scroll-mt-28 sm:scroll-mt-36` and CSS fallback `scroll-margin-top: 110px / 140px`) | [`src/app/page.js`](src/app/page.js), [`src/app/globals.css`](src/app/globals.css) | Jumping to `#signature-models` leaves full breathing room beneath the sticky header with eyebrow, title, and gold rule completely unobstructed. |
| **[P2] Signature Models Balanced Grid Layout** | 8 cards in 3 columns left an asymmetrical 3/3/2 layout with a gaping empty slot; single-column below 640px caused a tall scroll wall | Refactored to compact 2 columns on mobile and 4 columns on desktop (`grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6`) with tailored mobile card padding and typography | [`src/app/page.js`](src/app/page.js) | Eliminates tall mobile scroll wall while evenly dividing into 2 balanced rows of 4 cards on desktop without empty gaps. |
| **[P2] Product Ratings Review-Count Context** | Rating score showed star and number without review count context | Displayed `({product.reviewsCount})` beside numeric score | [`src/components/ProductCard.js`](src/components/ProductCard.js), [`src/components/QuickViewModal.js`](src/components/QuickViewModal.js) | Gives shoppers immediate visibility into the volume of reviews backing each product's score. |
| **[P2] Supported Breakpoint for Model-Card CTA Label** | `hidden xs:inline` failed to reveal "Drapes" due to undefined breakpoint; switched to `hidden sm:inline` and configured `--breakpoint-xs: 380px;` in `@theme` of `src/app/globals.css` so "Explore Drapes" appears cleanly on tablets/desktops | [`src/app/page.js`](src/app/page.js), [`src/app/globals.css`](src/app/globals.css) | Ensures "Explore Drapes" displays on viewports ≥ 640px while preventing awkward mobile text wraps. |
| **[P2] Craftsmanship-Hours Range Grammar** | Mixed correlative phrasing: "takes between 75 to 210" | Corrected to: "takes between 75 and 210" | [`src/app/page.js`](src/app/page.js) | Polishes heritage atelier storytelling grammar. |
| **[P2] Festive Offer & Product Discounts Alignment** | Banner advertised "up to 25% Off" while cards below showed 26–28%, ambiguous code stackability | Reconciled banner copy to "up to 28% Off" with explicit stackability for code `PALLUVO10` ("STACKABLE 10% OFF: PALLUVO10") | [`src/app/page.js`](src/app/page.js) | Banner aligns with product discounts (26–28%) and clarifies that `PALLUVO10` is an additional stackable checkout discount. |
| **[P2] Collection Intro Accurate Category Phrasing** | Labelled all eight featured styles strictly as "handloom weaves" (inaccurate for Ready-to-Wear pre-stitched drapes) | Broader accurate category description: *"eight signature saree styles"* | [`src/app/page.js`](src/app/page.js) | Replaced with: *"Explore our eight signature saree styles, each masterfully crafted with authentic silk, heritage motifs, and enduring artistry."* |
| **[P2] Shipping Threshold Copy in Announcement Bar** | Mathematical operator `"Complimentary Insured Shipping > ₹999"` | Natural promotional copy: `"Free insured shipping on orders ₹999+"` | [`src/components/Header.js`](src/components/Header.js) | Polished top announcement bar copy to natural conversational English. |
| **[P2] Newsletter Coming Soon Affordance & Label** | Form gave false confirmation without active backend endpoint | Explicitly marked as "Coming Soon" with disabled input and button affordances to prevent false confirmations; retained full accessible labeling | [`src/components/Footer.js`](src/components/Footer.js) | Added `Coming Soon` luxury pill badge, disabled input with `cursor-not-allowed`, and `<label htmlFor="newsletter-email" className="sr-only">`. |
| **[P2] Duplicate copy word** | `"the sacred sacred pheras"` | `"the sacred pheras"` | [`src/app/page.js`](src/app/page.js) | Removed the repeated word from the occasion-section intro paragraph (line 230). Proofread surrounding copy — no other duplicates found. |
| **[P2] Footer assurance row mobile reflow** | Three labels forced into one rigid row at 555px — crowded, low contrast | Labels wrap to a second line; each badge has a gold Lucide icon anchor | [`src/components/Footer.js`](src/components/Footer.js) | `flex gap-6` → `flex flex-wrap gap-x-5 gap-y-2`; `whitespace-nowrap` per badge keeps individual labels intact; `ShieldCheck`, `Award`, `Sparkles` icons add contrast against the dark footer. |
| **[P2] Legacy HTML cleanup** | 9 standalone HTML pages tracked at repo root | Deleted — App Router is the canonical storefront | `about.html`, `account.html`, `cart.html`, `checkout.html`, `contact.html`, `index.html`, `product.html`, `sarees.html`, `wishlist.html` | All content and behaviour represented by Next.js routes. Required assets (`images/`, `css/`, `js/`) remain intact. |

---

## 🐛 Bug Fix: Desktop Navigation Wrapping (Root Cause & Resolution)

### Problem
`src/components/Header.js` uses Tailwind utilities (`whitespace-nowrap`, `hidden`, `lg:flex`, `flex-nowrap`, `shrink-0`, etc.) but the emitted stylesheet for the App Router homepage contained **none** of these rules. The category nav links visibly wrapped at 1265 px in local preview.

### Root Cause
`@tailwindcss/postcss` was listed in `devDependencies` but **`postcss.config.mjs` did not exist**. Next.js requires an explicit PostCSS config file to activate the plugin; without it, it silently bypasses the transform and outputs a CSS-variables-only stylesheet (~22 KB, no utilities).

### Three-Layer Fix

| Layer | File | What it does |
| :--- | :--- | :--- |
| **1 — PostCSS pipeline** | [`postcss.config.mjs`](postcss.config.mjs) _(new)_ | Registers `@tailwindcss/postcss`; stylesheet grows from 22 KB → 47 KB with all utilities emitted |
| **2 — Tailwind class hardening** | [`src/components/Header.js`](src/components/Header.js) | `<nav>` gets `flex-nowrap overflow-x-auto`; every `<Link>` gets `whitespace-nowrap shrink-0`; main row `h-20` → `h-[72px]` with `.header-main-row` hook |
| **3 — CSS fallback** | [`src/app/globals.css`](src/app/globals.css) | Attribute-selector rules `header nav[aria-label="Saree Collections"]` force `flex-flow: row; flex-wrap: nowrap; white-space: nowrap !important`; links forced `flex-shrink: 0; word-break: keep-all` |

---

## 🎯 Direct Resolution of Reviewer Feedback

| Review Feedback | Resolution & Implementation |
| :--- | :--- |
| **[P2] Replace or Recrop Hero Image to Remove Embedded Magazine Masthead** | Replaced `public/images/hero_campaign.jpg` with a completely clean, bespoke high-fashion editorial drape. Removed the "VOGUE INDIA / MARCH 2024" masthead and "THE ART OF DRAPE / EMERALD ELEGANCE" cover typography, seamlessly restoring the carved sandstone palace archways and courtyard floor in the background. The hero now displays an uncompromised, Palluvo-owned luxury presentation that seamlessly harmonizes with the Festive collection badge and hero headline without competing publication text. |
| **[P3] Reduce Repeated Trust Claims Across the Storefront** | Eliminated redundant claims by assigning distinct, purposeful assurances to each layer of the customer journey: (1) **Post-Hero Assurance Band**: The single prominent home for authenticity and tailoring proofs (`Silk Mark Certified Purity`, `Direct from master weavers`, `Custom Blouse Tailoring Service`); (2) **Heritage Section**: Differentiated tile to focus on authentic weave technique (`Pure Zari & Natural Fibers` and `Complimentary Fall & Pico`) rather than repeating Silk Mark; (3) **Footer Trust Pillars**: Shifted from redundant weave claims to 3 distinct customer fulfillment & purchase protections (`Express Insured Delivery`, `Easy 7-Day Returns`, `100% Secure Checkout`); (4) **Footer Bottom Bar**: Replaced repeated Silk Mark text with operational proofs (`Verified Boutique Atelier`, `SSL Encrypted Transactions`, `Pan-India & Global Dispatch`). |
| **[P2] Move Three-Item Trust Strip Out of the Hero** | Extracted the three benefit statements (`Silk Mark Certified Purity`, `Direct from master weavers`, `Custom Blouse Tailoring Service`) out of the hero overlay in `src/app/page.js:74–84`. Created a dedicated, full-width post-hero trust band immediately below the hero (`border-y border-[#EDE3D5] bg-[#F8F5EF] py-4 sm:py-5`). This keeps the first screen clean and uncluttered around the main headline and CTAs, and resolves narrow-screen multi-line flex-wrap crowding by cleanly stacking on mobile (`flex-col`) and distributing with elegant gold dot dividers on desktop (`sm:flex-row`). |
| **[P3] Reduce Repeated Uppercase Eyebrow Labels** | Removed the uniform, widely tracked uppercase lead-in eyebrows from four commercial sections in `src/app/page.js`: "The Atelier Showcase", "Limited Festive Edit", "Most Loved Drapes", and "Curated Moments". Reserved the lead-in treatment strictly for two key narrative anchors: the seasonal hero badge (`Autumn / Festive 2026 Collection`) and the artisanal story (`Heritage Preservation`). This breaks the repetitive template rhythm and allows section headings to command clear, distinctive visual hierarchy. |
| **[P2] Reveal Product-Card Quick Actions to Keyboard & Touch Users** | `src/components/ProductCard.js:53` updated with `focus-within:translate-y-0` and `md:group-focus-within:translate-y-0` so tabbing into "Quick Add" or "Quick View" smoothly reveals and maintains the action overlay without clipping. Parent card styled with `focus-within:border-[#B08D57] focus-within:shadow-xl`. On mobile/touch layouts (`< md`), quick actions are directly visible and tappable (`md:translate-y-full md:group-hover:translate-y-0 md:group-focus-within:translate-y-0 focus-within:translate-y-0`) with compliant ≥44px hit areas (`min-h-[44px]` on Quick Add, `w-11 h-11 min-w-[44px] min-h-[44px]` on Quick View). |
| **[P2] Make Wishlist Controls Distinguishable and Large Enough (≥44×44px)** | Replaced generic `"Wishlist toggle"` label across `ProductCard.js:46`, `QuickViewModal.js:192`, and `product/[slug]/page.js:256` with dynamic, product-specific accessible names: `aria-label={isWishlisted ? \`Remove ${product.name} from wishlist\` : \`Add ${product.name} to wishlist\`}`. Added `aria-pressed={isWishlisted}` so screen readers accurately track toggle state. Expanded hit area to ≥44×44px (`w-11 h-11 min-w-[44px] min-h-[44px]`) with prominent focus rings (`focus-visible:ring-2 focus-visible:ring-[#641C2D]`). |
| **[P2] Increase Contrast on Product Discount Badges** | `src/components/ProductCard.js:34` updated from 10px white text on `#B08D57` (3.09:1) to dark charcoal foreground `text-[#1C1613]` on `bg-[#B08D57]`, raising the contrast ratio to **5.77:1** (measured **5.79:1**), comfortably surpassing the 4.5:1 WCAG AA target. |
| **[P2] Raise Contrast for Small Secondary Copy** | Replaced `#8E857B` across light cards and page body with `#665E57` (contrast **6.38:1 on white** and **5.84:1 on page surface**). On the dark footer background (`#2B211D`), updated secondary supporting text, newsletter copy, and badges to `#B8B0A5` (contrast **7.32:1 on `#2B211D`**). Defined surface-appropriate `--text-muted: #665E57;` and `--text-muted-dark: #B8B0A5;` tokens. |
| **Next.js & React Migration** | Fully rebuilt in Next.js 15 (App Router) + React 19 + Tailwind CSS + Lucide React. All 9 routes implemented and verified HTTP 200. |
| **Mobile Navigation Toggle (`#mobileMenuToggle`)** | `display: none` removed. `display: inline-flex !important` applied at `<1120px`. IDs `#mobileMenuToggle` and `#mobileMenuDrawer` present in `Header.js` and verified functional. |
| **Desktop Nav Wrapping at 1265px** | Root cause fixed via `postcss.config.mjs`. CSS pipeline now emits `.whitespace-nowrap`, `.lg:flex`, `.hidden`, `.flex-nowrap`, `.shrink-0` and all responsive variants. Nav hardened at JSX and CSS layers. Single-line confirmed at 1440px, 1265px, 1200px, and 1024px. Header compact at 72px. |
| **Party Wear Non-Saree Image** | Western gown replaced with authentic sheer black cocktail saree. All 8 occasion cards audited — 100% saree imagery confirmed. |
| **[P1] Shopping-bag control clipped at narrow mobile widths (360–375px)** | Adapted header layout: `gap-1 xs:gap-1.5 sm:gap-4` in action cluster, `px-2.5 sm:px-4` on bag button with `shrink-0`, `min-w-0` on logo container with truncated tagline, single-line compact announcement bar. Confirmed shopping-bag control, wishlist, search, and hamburger menu are 100% visible and unclipped at 360px and 365px. |
| **[P2] Hero trust badge copy** | Corrected `Direct Master Weaver Clustered` to `Direct from master weavers` in `src/app/page.js:80`. |
| **[P2] Anchor scroll offset for sticky header** | Added `scroll-mt-28 sm:scroll-mt-36` to `#signature-models` in `src/app/page.js` and CSS fallback `scroll-margin-top: 110px / 140px` in `src/app/globals.css`. Section eyebrow and title are now completely clear of the sticky header upon jump. |
| **[P2] Balanced 8-card signature models grid & compact mobile layout** | Converted grid to 2 columns on mobile and 4 columns on desktop (`grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6`) in `src/app/page.js`, eliminating the single-column wall of tall cards on phones and evenly dividing all 8 models into two balanced rows of 4 cards on desktop. |
| **[P2] Supported breakpoint for model-card CTA label** | `hidden xs:inline` failed to reveal "Drapes" due to undefined breakpoint; switched to `hidden sm:inline` and configured `--breakpoint-xs: 380px;` in `@theme` of `src/app/globals.css` so "Explore Drapes" appears cleanly on tablets/desktops. |
| **[P2] Craftsmanship-hours range grammar** | Corrected "takes between 75 to 210" to "takes between 75 and 210" in `src/app/page.js:278` to fix the correlative conjunction grammar. |
| **[P2] Product ratings review-count context** | Added `({product.reviewsCount})` beside the star and score in `src/components/ProductCard.js` and `QuickViewModal.js` so shoppers can see the review volume backing each score. |
| **[P2] Reconciled festive offer & product discounts** | Aligned banner copy in `src/app/page.js` to "Celebrate in Heirloom Grandeur with up to 28% Off", matching the 26–28% discounts on cards below, and clarified stackability: "STACKABLE 10% OFF: PALLUVO10". |
| **[P2] Accurate collection intro copy** | Changed collection intro phrasing to: *"Explore our eight signature saree styles, each masterfully crafted with authentic silk, heritage motifs, and enduring artistry."* Accurately covers both handloom and pre-stitched Ready-to-Wear styles. |
| **[P2] Shipping threshold copy** | Changed `"Complimentary Insured Shipping > ₹999"` to natural promotional English: `"Free insured shipping on orders ₹999+"` in `src/components/Header.js:95`. |
| **[P2] Newsletter coming-soon status & disabled affordance** | Clearly marked with "Coming Soon" badge, disabled input with `placeholder="Subscriptions opening soon..."`, and disabled Join button to avoid false confirmations while active subscription backend is being established. Retained `<label htmlFor="newsletter-email" className="sr-only">`. |
| **[P2] Duplicate word in occasion intro** | `"the sacred sacred pheras"` corrected to `"the sacred pheras"` in `src/app/page.js`. Full copy proofread — no other duplicates found. |
| **[P2] Footer assurance row crowded on mobile** | Row now uses `flex-wrap` so badges reflow at ~555px. Each badge has a small gold icon for contrast. Individual label text protected with `whitespace-nowrap`. |
| **[P2] Nine legacy HTML pages** | `about.html`, `account.html`, `cart.html`, `checkout.html`, `contact.html`, `index.html`, `product.html`, `sarees.html`, `wishlist.html` removed via `git rm`. App Router routes are now the sole storefront source. |
| **Top Category Buttons Reactivity & Search Sync** | Synchronized `useSearchParams()` with filter state in `src/app/sarees/page.js` via `useEffect` so clicking any category button ("New Arrivals", "Kanjivaram", "Banarasi", "Paithani", "Chanderi", "Organza", "Ready-to-Wear", "All Sarees") instantly filters catalog without full page reload. Added active visual indicators in `Header.js`, interactive promo code copy in top announcement bar, and removable active filter chips. |

---

## 🔬 Testing & Verification

- [x] **[P2] Hero Image Magazine Masthead Removed:** `public/images/hero_campaign.jpg` verified completely free of external magazine typography, "VOGUE INDIA" masthead, or text overlays; background palace architecture seamlessly restored.
- [x] **[P3] Distinct Non-Repeating Trust Claims:** Verified Silk Mark is showcased prominently in the post-hero band; Heritage section focuses on Pure Zari & Natural Fibers; Footer features distinct 3-pillar fulfillment and purchase protection guarantees (Delivery, Returns, Secure Checkout).
- [x] **[P2] Post-Hero Trust Assurances Band:** Verified hero section provides clean focus on headline, subtext, and CTAs without crowded trust statements; assurances band renders immediately below the hero on `#F8F5EF` with >11:1 text contrast, stacking cleanly on mobile and horizontally on desktop.
- [x] **[P3] Heading Hierarchy & Eyebrow Treatment:** Removed uniform uppercase eyebrows from Top Models, Festive Banner, Trending, and Occasions sections, allowing primary titles to stand with distinct authority; preserved eyebrow treatment for Hero badge and Craftsmanship Heritage story.
- [x] **[P2] Product Card Quick Actions Revealed to Keyboard & Touch Users:** Verified `focus-within:translate-y-0` reveals Quick Add and Quick View buttons when navigating via keyboard Tab without clipping. Verified mobile viewports (`< md`) have directly visible, easily tappable buttons with ≥44px hit area (`min-h-[44px]` and `min-w-[44px]`).
- [x] **[P2] Distinguishable Wishlist Controls & ≥44×44px Hit Area:** Verified wishlist buttons feature dynamic product-specific `aria-label` ("Add {name} to wishlist" / "Remove {name} from wishlist"), `aria-pressed`, and expanded 44×44px (`w-11 h-11 min-w-[44px] min-h-[44px]`) touch targets with visible focus rings across ProductCard, QuickViewModal, and Product Detail Page.
- [x] **[P2] Product Discount Badge Contrast:** Verified `src/components/ProductCard.js:34` renders dark charcoal text (`#1C1613`) on `#B08D57` gold pill, giving a **5.79:1** contrast ratio, surpassing the 4.5:1 WCAG AA minimum.
- [x] **[P2] Secondary Copy Contrast on Light & Dark Surfaces:** Replaced `#8E857B` across all light surfaces with `#665E57` (**5.84:1 on page surface**). Updated dark footer (`#2B211D`) supporting copy, pillars, newsletter, and assurance items to `#B8B0A5` (**7.32:1 on #2B211D**). Both comfortably exceed the 4.5:1 WCAG AA target.
- [x] **[P2] Compact 2-Column Mobile Signature Grid:** Verified 2-column mobile layout with compact card padding, adjusted typography, and clamped descriptions on viewports < 640px, eliminating the tall vertical wall.
- [x] **[P2] Balanced 8-Card Signature Grid on Desktop:** Verified 4-column layout on desktop divides all 8 signature models into two perfectly balanced rows of 4 cards.
- [x] **[P2] Model-Card CTA Label Breakpoint:** Verified `hidden sm:inline` reveals "Drapes" on tablet and desktop, with `--breakpoint-xs: 380px;` configured in `@theme`.
- [x] **[P2] Craftsmanship Hours Range Grammar:** Verified line 278 uses correct grammatical phrasing ("takes between 75 and 210").
- [x] **[P2] Product Ratings Review-Count Context:** Verified `({product.reviewsCount})` renders beside the star and score on product cards and quick-view modal.
- [x] **[P2] Reconciled Festive Offer Copy:** Verified banner offers "up to 28% Off" matching the 26–28% discounts on products, with clear stackability for code `PALLUVO10`.
- [x] **[P2] Newsletter Coming Soon Affordance:** Explicitly displays "Coming Soon" with disabled input and button affordance, preventing false confirmations.
- [x] **[P2] Collection Intro Accurate Category Phrasing:** Verified `"eight signature saree styles"` accurately encompasses all 8 items (including Ready-to-Wear).
- [x] **[P2] Shipping Threshold Copy:** Verified `"Free insured shipping on orders ₹999+"` renders cleanly in the announcement bar without mathematical operators.
- [x] **[P2] Newsletter Accessible Label:** Verified `<label htmlFor="newsletter-email">` and `aria-label` provide accessible naming for screen readers.
- [x] **[P2] Anchor Scroll Offset:** Tested clicking "Explore Top Models"; `#signature-models` opens with eyebrow, title, and divider perfectly visible below the sticky header on both mobile and desktop.
- [x] **[P1] Narrow Mobile Screen Fit (360–375px):** Shopping-bag control, wishlist, search, and hamburger menu verified fully visible with zero clipping or horizontal overflow.
- [x] **[P2] Hero trust badge copy:** Verified line 80 renders `"Direct from master weavers"` cleanly.
- [x] **PostCSS Pipeline:** `postcss.config.mjs` confirmed present. Bundle: **47 KB** prod / **61 KB** dev. All utilities (`whitespace-nowrap`, `lg:flex`, `flex-nowrap`, `shrink-0`) confirmed in emitted CSS.
- [x] **Desktop Nav Single-Line:** Verified at 1440px, 1265px, 1200px, and 1024px — no wrapping. Header compact at 72px.
- [x] **[P2] Copy proofread:** Occasion intro corrected (`sacred sacred` → `sacred`). No other duplicate words found in `src/app/page.js` or component copy.
- [x] **[P2] Footer assurance row:** At ~555px badges wrap cleanly to a second line. Each badge is visually anchored with a gold icon. No crowding.
- [x] **[P2] Legacy HTML deleted:** `git rm` confirmed all 9 root-level `.html` files removed. `git status` clean after commit. Assets (`images/`, `css/`, `js/`) verified present.
- [x] **Production Build:** `npm run build` — `✓ Compiled successfully`. 11 routes (10 static + 1 dynamic). Zero errors.
- [x] **100% Saree Merchandising Audit:** Zero non-saree imagery across all 8 occasion cards and 25-item catalog.
- [x] **All Routes HTTP 200:** `/`, `/sarees`, `/product/[slug]`, `/cart`, `/checkout`, `/wishlist`, `/about`, `/contact`, `/account`.
- [x] **Cart & Wishlist Reactivity:** Item quantity, blouse selection, promo code (`PALLUVO10`), and cart drawer verified.

---

## 📁 All Files Changed Across This PR

| File | Status | Summary |
| :--- | :--- | :--- |
| [`postcss.config.mjs`](postcss.config.mjs) | ✅ **Added** | Activates `@tailwindcss/postcss`; fixes the CSS pipeline |
| [`src/components/Header.js`](src/components/Header.js) | ✅ **Modified** | Nav hardened with active states; adapted for 360–375px mobile screens; shopping bag control fully visible without clipping; polished shipping threshold copy |
| [`src/app/globals.css`](src/app/globals.css) | ✅ **Modified** | `@theme` `--breakpoint-xs: 380px;` defined; CSS fallback: `nav[aria-label="Saree Collections"]` forced single-row; responsive `.header-main-row` height (64px mobile, 72px desktop); `#signature-models` scroll margin fallback |
| [`src/app/page.js`](src/app/page.js) | ✅ **Modified** | [P2] Extracted trust assurances out of hero into dedicated post-hero band; [P3] differentiated heritage craftsmanship tile to focus on pure zari & natural fibers; [P3] eliminated repetitive section eyebrows to establish clean heading hierarchy; [P2] 2-column mobile / 4-column desktop balanced 8-card grid with adjusted mobile content; `sm:inline` on CTA label; corrected craftsmanship hours grammar; reconciled festive offer to up to 28% off + stackable code; scroll offset added to `#signature-models`; updated collection intro; fixed hero trust badge copy |
| [`src/components/ProductCard.js`](src/components/ProductCard.js) | ✅ **Modified** | [P2] Reveal quick actions on focus-within & touch viewports; dynamic product-specific `aria-label` & `aria-pressed`; 44×44px wishlist hit area; high-contrast 5.79:1 discount badge; review-count context |
| [`src/components/QuickViewModal.js`](src/components/QuickViewModal.js) | ✅ **Modified** | [P2] Dynamic product-specific `aria-label` & `aria-pressed`; guaranteed ≥44×44px wishlist hit area; review-count context |
| [`src/app/product/[slug]/page.js`](src/app/product/%5Bslug%5D/page.js) | ✅ **Modified** | [P2] Product-specific `aria-label` & `aria-pressed` for PDP wishlist button; ≥44×44px hit area with focus-visible ring |
| [`src/components/Footer.js`](src/components/Footer.js) | ✅ **Modified** | [P3] Replaced repeated weave/silk claims with 3 distinct customer guarantees (Express Delivery, 7-Day Returns, Secure Checkout) and updated bottom bar badges to distinct operational proofs; [P2] Clearly marked "Coming Soon" newsletter state with disabled affordance |
| [`public/images/hero_campaign.jpg`](public/images/hero_campaign.jpg) | ✅ **Modified** | [P2] Cleaned high-fashion editorial hero drape; completely removed "VOGUE INDIA" masthead and cover text; seamlessly restored architectural palace background |
| [`src/app/sarees/page.js`](src/app/sarees/page.js) | ✅ **Modified** | Reactively syncs URL search params with filter state; handles top category clicks, badges, Ready-to-Wear, and filter chips; editorial luxury saree photo background hero banner |
| [`public/images/catalog_hero_banner.jpg`](public/images/catalog_hero_banner.jpg) | ✅ **Added** | High-fashion editorial royal crimson & gold handloom saree photography for catalog hero banner |
| `about.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/about` Next.js route |
| `account.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/account` Next.js route |
| `cart.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/cart` Next.js route |
| `checkout.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/checkout` Next.js route |
| `contact.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/contact` Next.js route |
| `index.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/` Next.js route |
| `product.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/product/[slug]` Next.js route |
| `sarees.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/sarees` Next.js route |
| `wishlist.html` | 🗑️ **Deleted** | Legacy standalone page — replaced by `/wishlist` Next.js route |
| [`PULL_REQUEST.md`](PULL_REQUEST.md) | ✅ **Updated** | Reflects all fixes across all reviews |

---

## 🚀 How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start Next.js development server:**
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
4. **Create production build:**
   ```bash
   npm run build && npm run start
   ```
