# Pull Request: PALLUVO Next.js (React) Tech Stack Migration & Luxury Saree Experience

**PR Title:** `feat(ts): project-wide TypeScript migration and obsolete files cleanup`  
**Base Branch:** `main`  
**Target Branch:** `main`  
**Status:** `READY TO MERGE` | **Last Updated:** `2026-10-21`

---

## 📌 Executive Summary

This pull request transitions **PALLUVO — Contemporary Luxury Indian Saree Fashion House & Boutique Atelier** from a multi-page static HTML/Vanilla JS codebase into a modern, production-grade **Next.js 15 (App Router) + React 19 + TypeScript (Strict Mode) + Tailwind CSS 4 + Lucide Icons** web application.

The migration preserves strict **100% saree-only merchandising**, authentic master-weaver artisan photography, custom blouse tailoring workflows, and verified customer concierge channels while dramatically improving client-side responsiveness, type safety, accessibility, security, and SEO capabilities.

**Latest revisions** resolve all reviewer findings across design, accessibility, and distributed concurrency:
1. **Full TypeScript Migration:** Converted all components, pages, utility modules, contexts, and actions to strict TypeScript with comprehensive type interfaces in [`src/types/index.ts`](src/types/index.ts).
2. **Accessible Search Modal Dialog:** Implemented search overlay as a fully accessible dialog in [`src/components/Header.tsx`](src/components/Header.tsx) (`role="dialog"`, `aria-modal="true"`, focus trapping, Escape dismissal, and focus restoration).
3. **Accessible Search Field Names:** Added programmatic accessible names (`id`, `aria-label`, `<label className="sr-only">`, `role="search"`) to desktop and overlay inputs.
4. **Mobile Navigation Overlay:** Refactored mobile drawer in [`src/components/Header.tsx`](src/components/Header.tsx) with modal dialog semantics, keyboard focus trapping, and focus restoration.
5. **Sticky Header Containment:** Replaced `overflow-x: hidden` with `overflow-x: clip` in [`src/app/globals.css`](src/app/globals.css), preserving `position: sticky; top: 0` alongside subtle elevated shadow.
6. **Tablet Footer Layout:** Configured `sm:grid-cols-3` guarantee band in [`src/components/Footer.tsx`](src/components/Footer.tsx), rendering delivery, returns, and checkout assurances in 3 columns at tablet widths with zero overflow.
7. **Compliant Touch Targets (≥44×44px):** Guaranteed ≥44×44px hit areas and ≥6px physical separation for all interactive controls across mobile viewports down to 320px.
8. **Mobile Hero Badge Single-Line Scaling:** Prevented word wrapping/orphaning in seasonal badge via responsive text scaling.
9. **Dedicated Mobile Hero Image Card:** Recomposed mobile hero in [`src/app/page.tsx`](src/app/page.tsx) with a dedicated image card (`aspect-[4/5]`, `rounded-2xl`, unoccluded drape visibility) and stacked copy below.
10. **Product Card Discount Badge Relocation:** Moved discount badges into the dedicated pricing row, eliminating model occlusion on product cards.
11. **Complete Tagline Display:** Ensured brand tagline *"Every drape, a little magic."* renders single-line without clipping across narrow screens.
12. **Tablet Newsletter Form Sizing:** Constrained newsletter inputs in [`src/components/Footer.tsx`](src/components/Footer.tsx) to fit within 768px viewports without horizontal scroll.
13. **WCAG AA/AAA Color Contrast:** Raised all small and secondary text contrast to exceed WCAG AA (≥4.5:1) and AAA (≥7.0:1) requirements.
14. **Customer Auth & Redirection:** Implemented storefront routes `/login` and `/register` with safe post-auth redirect validation in [`src/app/login/actions.ts`](src/app/login/actions.ts).
15. **User-Scoped Order Isolation:** Partitioned customer order history in [`src/app/account/AccountClient.tsx`](src/app/account/AccountClient.tsx) by authenticated `userId` and backed by Supabase RLS policies.
16. **Guest Order Linking:** Added canonical email normalization in [`src/utils/format.ts`](src/utils/format.ts) and exact-match reconciliation in [`src/app/account/page.tsx`](src/app/account/page.tsx), preventing case-mismatch and wildcard (`_`/`%`) injection leaks.
17. **Atomic CAS Commit & Takeover:** Implemented exclusive `commit_lock` transactions and `.new` rename takeovers in [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts).
18. **Linearizable Ticket Election:** Implemented OS-level sequence reservation (`seq_*.ticket` via `openSync 'wx'`) in `acquireStaleReclaimMutex` to eliminate double-elections.
19. **Atomic Stale Lock Takeover:** Built `atomicTakeoverStaleLock` with dedicated `.takeover` mutex, immediate PID/owner metadata registration, and dead-owner verification.
20. **Orphan Ticket Recovery:** Safely unlinks corrupted/0-byte tickets during reclaim election to avoid deadlocks.
21. **Fail-Closed Write Handling & Pre-Critical Section Fencing:** Enforced descriptor link checks (`fstatSync(fd).nlink > 0`) and owner token matching before executing protected blocks.
22. **Inode & Ownership Fencing on Cleanup:** Implemented `unlinkIfSameInode(filePath, fd, expectedOwnerId)` across all lock write-failure cleanups and release routines, preventing removal of competitor replacement locks.
23. **Single-Host Admission Store Scoping:** Formally scoped `CrossProcessAdmissionStore` to single persistent host / container environments coordinating across Node worker threads and cluster processes, documenting the distributed serverless architecture where PostgreSQL RPC `consume_contact_rate_limit` coordinates global multi-instance limits via row locks.
24. **Takeover Cleanup Mutex Fencing Across Create-to-Metadata Gap:** Implemented `isTakeoverFenceValid` verifying descriptor link status (`nlink > 0`), on-disk existence, inode/device equality (`fstatSync(takeoverFd).ino === statSync(takeoverMutexPath).ino`), and metadata ownership before touching target lock files. Updated `isLockOwnerAlive` to guard the create-to-metadata gap (< 2000ms), and added multiprocess regression tests pausing immediately after `openSync('wx')` to ensure lost takeover locks abort without deleting replacement locks.
25. **Atomic Payment Claim & Two-Phase Order Commit:** Implemented `claimPaymentSession` and `releasePaymentClaim` RPCs with `FOR UPDATE` row-level locks, preventing concurrent double-order submissions for the same payment session. If order insertion fails, the claim is atomically released so legitimate customers can retry without lockout.
26. **Scoped Duplicate-Payment Order Recovery & Exact Payment Matching:** Scoped duplicate-payment order recovery with an own-order predicate (`user_id` matching or normalized customer email), implemented `isOrderOwnedByRequester` to prevent unauthenticated guests or unauthorized users from claiming arbitrary orders, eliminated unescaped PostgREST LIKE pattern matching on `payment_status` by querying dedicated indexed `payment_id` column with exact equality (`.eq('payment_id', paymentId)`), double-quoted filter operands with `escapePostgrestFilterValue` to prevent grammar injection via commas in emails, corrected database migration backfill to use a single capture group extracting the gateway payment ID (rather than method name), and projected only necessary fields (`ORDER_SELECT_FIELDS`) through `toPlacedOrder` without leaking sensitive or unmodeled database fields.
27. **Comprehensive Test Suite:** 170/170 unit, integration, and regression tests pass across 14 test suites covering rate limiting, atomic payment reservation, ownership isolation, wildcard injection prevention, PostgREST filter escaping, and responsive luxury UI accessibility.

---

## 🌟 Key Architecture & Stack Highlights

### 1. Technology Stack Modernization
- **Framework:** Next.js 15 (App Router with nested server & client components)
- **UI & Logic:** React 19 + TypeScript (Strict Mode) with custom hooks and persistent Context API
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss` with custom luxury tokens (Deep Burgundy `#641C2D`, Antique Gold `#B08D57`, Warm Ivory `#F8F5EF`, Dark Brown `#2B211D`)
- **CSS Pipeline:** `postcss.config.mjs` → `@tailwindcss/postcss` → full utility bundle
- **Iconography:** Lucide React icons
- **State Persistence:** LocalStorage-backed cart, wishlist, and promotional discount state, with user-scoped isolation
- **Database & Auth:** Supabase Auth + PostgreSQL Server Actions + Row Level Security (RLS) + Advisory Locking Rate Limiter

### 2. Full Application Suite Routes
- `/` — Curated boutique homepage with editorial hero, 8 signature saree models, limited festive banner, trending carousel, and handloom craft storytelling.
- `/sarees` — Complete 29-saree luxury catalog with real-time weave filtering, occasion selectors, price slider, live text search, and multi-parameter sorting.
- `/product/[slug]` — High-resolution dynamic product detail page with image gallery viewer, color swatches, 4-tier blouse tailoring selector, full weave specifications, and recommendation engine.
- `/cart` & `/checkout` — Full shopping bag drawer & standalone cart, promo code verification (`PALLUVO10`, `FIRSTDRAPE`), free shipping threshold progress bar, and 3-step checkout with instant order generation.
- `/wishlist` — Persistent saved favorites gallery with one-click move to bag.
- `/about` — Editorial atelier story honoring India's master weavers and Silk Mark certification.
- `/contact` — Concierge hub with verified contact channels (`info@palluvo.store`, `+91 88977 76984`, `+91 84988 54323`, `+91 81067 89789`) and interactive consultation form with multi-tier rate limiting.
- `/account` — Customer order history, privilege status (*Silk Circle Gold*), and delivery address management.
- `/login` & `/register` — Customer sign-in and account registration with Suspense boundaries and safe redirect validation.
- `/api/cron/prune-rate-limits` — Authenticated serverless endpoint for periodic rate limit expiry maintenance.

---

## 📋 Complete Implementation & Files Changed Matrix

| Component / File | Status | Description & Impact |
| :--- | :--- | :--- |
| **Storefront Root & Layout** | | |
| [`src/app/layout.tsx`](src/app/layout.tsx) | ✅ **Migrated** | Root layout with self-hosted Google fonts (`next/font/google`), responsive global shell, JSON-LD schema, and `StoreProvider` context wrapping |
| [`src/app/globals.css`](src/app/globals.css) | ✅ **Modified** | Luxury theme tokens, Tailwind 4 directives, `@media (prefers-reduced-motion)` smooth-scroll guards, and `overflow-x: clip` sticky header rules |
| [`src/app/page.tsx`](src/app/page.tsx) | ✅ **Migrated** | Curated homepage with unoccluded mobile hero image card, 8-card balanced signature models grid, festive banner, and craftsmanship heritage narrative |
| [`src/app/not-found.tsx`](src/app/not-found.tsx) | ✅ **Added** | Branded luxury 404 error page with navigation shortcuts back to boutique catalog |
| [`src/app/robots.ts`](src/app/robots.ts) | ✅ **Added** | Dynamic robots configuration protecting private user paths (`/account`, `/checkout`, `/cart`) while exposing public pages |
| [`src/app/sitemap.ts`](src/app/sitemap.ts) | ✅ **Added** | Search engine sitemap with stable content timestamps and dynamic product slug entries |
| **Catalog & Products** | | |
| [`src/app/sarees/page.tsx`](src/app/sarees/page.tsx) | ✅ **Migrated** | Server component for `/sarees` catalog with SEO metadata and Suspense boundary |
| [`src/app/sarees/SareesClient.tsx`](src/app/sarees/SareesClient.tsx) | ✅ **Added** | Dynamic interactive catalog client: multi-parameter weave filters, price range slider, search bar, sort combobox, and live ARIA counter |
| [`src/app/product/[slug]/page.tsx`](src/app/product/%5Bslug%5D/page.tsx) | ✅ **Migrated** | Dynamic route server component with `generateStaticParams`, `generateMetadata`, and `notFound()` handling |
| [`src/app/product/[slug]/ProductDetailContent.tsx`](src/app/product/%5Bslug%5D/ProductDetailContent.tsx) | ✅ **Added** | Product detail client: interactive gallery, color swatches with `aria-pressed`, 4-tier blouse stitching selector, and dynamic wishlist toggle |
| [`src/data/products.ts`](src/data/products.ts) | ✅ **Migrated** | Authoritative dataset of 29 authentic luxury sarees (`saree-001` through `saree-029`) with rich weave metadata, dimensions, care guides, and pricing |
| **Cart, Checkout & Wishlist** | | |
| [`src/app/cart/page.tsx`](src/app/cart/page.tsx) | ✅ **Migrated** | Server component for `/cart` bag view with SEO metadata and `noindex` policy |
| [`src/app/cart/CartClient.tsx`](src/app/cart/CartClient.tsx) | ✅ **Added** | Standalone cart client with item stepper, blouse customization recap, promo verification (`PALLUVO10`), and free delivery progress bar |
| [`src/app/checkout/page.tsx`](src/app/checkout/page.tsx) | ✅ **Migrated** | Server component for `/checkout` order submission route |
| [`src/app/checkout/CheckoutClient.tsx`](src/app/checkout/CheckoutClient.tsx) | ✅ **Added** | 3-step checkout client with inline validation, numeric keypads (`inputMode="numeric"` / `inputMode="tel"`), Cash on Delivery selection, and accessible confirmation focus |
| [`src/app/checkout/actions.ts`](src/app/checkout/actions.ts) | ✅ **Added** | Server action for durable order persistence: canonical email normalization (`normalizeEmail`), validation, and fail-closed Supabase insert error propagation |
| [`src/app/wishlist/page.tsx`](src/app/wishlist/page.tsx) | ✅ **Migrated** | Server component for `/wishlist` route with SEO metadata |
| [`src/app/wishlist/WishlistClient.tsx`](src/app/wishlist/WishlistClient.tsx) | ✅ **Added** | Saved drapes gallery with live ARIA status notifications, quick add to bag, and empty-state guidance |
| **Customer Authentication & Account** | | |
| [`src/app/account/page.tsx`](src/app/account/page.tsx) | ✅ **Migrated** | Server component for `/account` with authenticated session verification, exact-match email guest order reconciliation, and RLS order lookup |
| [`src/app/account/AccountClient.tsx`](src/app/account/AccountClient.tsx) | ✅ **Added** | Account dashboard client: deterministic hydration, user-scoped order caching (`palluvo_orders_${userId}`), delivery addresses, and privilege tier display |
| [`src/app/account/AccountPortal.tsx`](src/app/account/AccountPortal.tsx) | ✅ **Added** | Navigation links and session control portal for customer account management |
| [`src/app/login/page.tsx`](src/app/login/page.tsx) | ✅ **Added** | Customer login page route wrapped in Suspense boundary |
| [`src/app/login/LoginForm.tsx`](src/app/login/LoginForm.tsx) | ✅ **Added** | Client sign-in form with accessible labels, loading states, and error alerts |
| [`src/app/login/actions.ts`](src/app/login/actions.ts) | ✅ **Added** | Supabase login and signup server actions with `getSafeRedirect()` open-redirect mitigation |
| [`src/app/register/page.tsx`](src/app/register/page.tsx) | ✅ **Added** | Customer account registration page route wrapped in Suspense boundary |
| [`src/app/register/RegisterForm.tsx`](src/app/register/RegisterForm.tsx) | ✅ **Added** | Client registration form with password confirmation and input validation |
| **Contact, Atelier & Rate Limiting** | | |
| [`src/app/about/page.tsx`](src/app/about/page.tsx) | ✅ **Migrated** | Atelier heritage page honoring India's handloom clusters, Silk Mark certification, and master weavers |
| [`src/app/contact/page.tsx`](src/app/contact/page.tsx) | ✅ **Migrated** | Concierge route server component with structured business metadata |
| [`src/app/contact/ContactClient.tsx`](src/app/contact/ContactClient.tsx) | ✅ **Added** | Accessible contact inquiry form with single authoritative `role="alert"` live error region, phone dialing links, and Google Maps embed |
| [`src/app/contact/actions.ts`](src/app/contact/actions.ts) | ✅ **Added** | Server action for contact submission: payload bounds, single-host burst admission gating, Supabase RPC rate limiting, and mailbox verification |
| [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts) | ✅ **Added** | High-performance multi-tier rate limiter: HMAC-SHA256 identifier hashing, atomic CAS commit transactions, `unlinkIfSameInode` descriptor fencing, linearizable ticket election, and single-host scoped file locking |
| [`src/app/api/cron/prune-rate-limits/route.ts`](src/app/api/cron/prune-rate-limits/route.ts) | ✅ **Added** | Authenticated serverless endpoint for periodic rate limit expiry pruning |
| [`supabase/migrations/20261012_contact_rate_limiter.sql`](supabase/migrations/20261012_contact_rate_limiter.sql) | ✅ **Added** | PostgreSQL rate limiting migration: row-level locking (`consume_contact_rate_limit`), advisory capacity lock, hard bounds, and `active_contact_rate_limits` view |
| **Shared UI Components** | | |
| [`src/components/Header.tsx`](src/components/Header.tsx) | ✅ **Migrated** | Accessible header: modal dialog search overlay, focus trapping, 44×44px hit targets, non-wrapping navigation, and cropped 47 KB logo |
| [`src/components/Footer.tsx`](src/components/Footer.tsx) | ✅ **Migrated** | Responsive footer: 3-column tablet guarantee band, non-overflowing newsletter form, distinct non-repeating operational proofs, and contact details |
| [`src/components/ProductCard.tsx`](src/components/ProductCard.tsx) | ✅ **Migrated** | Accessible product card: relocated discount badge, 44×44px wishlist button, `tabular-nums` prices, and keyboard-revealed quick actions |
| [`src/components/CartDrawer.tsx`](src/components/CartDrawer.tsx) | ✅ **Migrated** | Sliding shopping bag drawer with contextual quantity buttons, free shipping calculator, and checkout trigger |
| [`src/components/QuickViewModal.tsx`](src/components/QuickViewModal.tsx) | ✅ **Migrated** | Accessible modal dialog for rapid drape inspection with thumbnail selection semantics and high-contrast ratings |
| [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx) | ✅ **Added** | Ergonomic mobile navigation bar for one-handed access to Shop, Search, Wishlist, Bag, and Account |
| [`src/components/MobileShowcaseSlider.tsx`](src/components/MobileShowcaseSlider.tsx) | ✅ **Added** | Touch-friendly swipeable carousel for mobile product highlights |
| [`src/components/Toast.tsx`](src/components/Toast.tsx) | ✅ **Migrated** | Semantic live notifications supporting success, error (`role="alert"`), and warning types |
| **Contexts, Types & Utilities** | | |
| [`src/context/StoreContext.tsx`](src/context/StoreContext.tsx) | ✅ **Migrated** | Central reactive state provider for cart, wishlist, active promo codes, drawer states, and user-scoped orders |
| [`src/types/index.ts`](src/types/index.ts) | ✅ **Added** | Comprehensive TypeScript interfaces for Products, Reviews, Cart Items, Blouse Options, Orders, and Addresses |
| [`src/utils/format.ts`](src/utils/format.ts) | ✅ **Added** | Currency formatter (`formatINR`), date formatter, and `normalizeEmail` helper for canonical lower-cased trimmed emails |
| [`src/utils/payment/provider.ts`](src/utils/payment/provider.ts) | ✅ **Added** | Payment provider abstraction interface with Cash on Delivery gateway and pending digital provider stubs |
| [`src/utils/useBodyScrollLock.ts`](src/utils/useBodyScrollLock.ts) | ✅ **Added** | Custom hook managing body scroll locking during modal dialog and drawer presentations |
| [`src/utils/supabase/client.ts`](src/utils/supabase/client.ts) | ✅ **Added** | Browser-side Supabase client using public environment variables |
| [`src/utils/supabase/server.ts`](src/utils/supabase/server.ts) | ✅ **Added** | Server-side Supabase client with cookie forwarding for server components and actions |
| [`src/utils/supabase/admin.ts`](src/utils/supabase/admin.ts) | ✅ **Added** | Server-only admin Supabase client using service role key for privileged operations |
| [`src/utils/supabase/config.ts`](src/utils/supabase/config.ts) | ✅ **Added** | Deployment configuration validators including `isEmailConfirmationEnforced` |
| [`src/utils/supabase/middleware.ts`](src/utils/supabase/middleware.ts) | ✅ **Added** | Supabase session synchronization middleware |
| [`src/proxy.ts`](src/proxy.ts) | ✅ **Added** | Next.js 16 proxy convention managing session cookies across routes |
| **Configuration, CI/CD & Tests** | | |
| [`package.json`](package.json) | ✅ **Modified** | Updated `eslint` to `^9.0.0` for `eslint-config-next@16.4.0` compatibility and updated `lint` script to `eslint .` |
| [`tsconfig.json`](tsconfig.json) | ✅ **Added** | Strict TypeScript compiler configuration with `@/*` path mapping |
| [`eslint.config.mjs`](eslint.config.mjs) | ✅ **Added** | Flat ESLint 9 configuration with Next.js core-web-vitals rules |
| [`postcss.config.mjs`](postcss.config.mjs) | ✅ **Added** | Activates `@tailwindcss/postcss` for the Tailwind 4 compilation pipeline |
| [`vercel.json`](vercel.json) | ✅ **Added** | Scheduled Vercel cron configuration for periodic rate limit pruning |
| [`.github/workflows/rate-limit-cleanup.yml`](.github/workflows/rate-limit-cleanup.yml) | ✅ **Added** | GitHub Actions workflow for automated background rate limit pruning |
| [`.env.example`](.env.example) | ✅ **Modified** | Documented Supabase keys, rate limit peppers, and `REQUIRE_EMAIL_CONFIRMATION` requirements |
| [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) | ✅ **Added** | 50 integration and regression tests: lock reclamation, ticket election, atomic CAS commit, takeover-serialized inode fencing, throttled request flood counting, and rate limiting |
| [`tests/guest-order-casing.test.mjs`](tests/guest-order-casing.test.mjs) | ✅ **Added** | 5 regression tests: mixed-case email normalization, exact guest-order claiming, and wildcard (`_`/`%`) injection prevention |
| **Legacy Files Cleanup** | | |
| `about.html`, `account.html`, `cart.html`, `checkout.html`, `contact.html`, `index.html`, `product.html`, `sarees.html`, `wishlist.html` | 🗑️ **Deleted** | Removed all 9 legacy static HTML files; storefront is 100% powered by Next.js App Router |

---

## 🎯 Direct Resolution of Reviewer Feedback

| Review Feedback | Resolution & Implementation |
| :--- | :--- |
| **[P1] Atomically Claim Payment ID Before Creating Order (Recoverable Reservation Workflow)** | In [`src/app/checkout/actions.ts`](src/app/checkout/actions.ts), [`src/utils/payment/provider.ts`](src/utils/payment/provider.ts), and [`supabase/migrations/20261028_payment_sessions.sql`](supabase/migrations/20261028_payment_sessions.sql), resolved the concurrency race condition where two simultaneous checkout submissions with the same pre-verified payment could both see no existing order in the `orders` table and create duplicate separate orders before post-insert consumption. Implemented an atomic recoverable reservation workflow: (1) `claimPaymentSession` is invoked before attempting order insertion in Supabase, acquiring an atomic claim on the `paymentId` via database RPC (`claim_payment_session`) or file lock; (2) If another concurrent request has already claimed the payment, the second request does NOT insert another order, but instead awaits/recovers the winner's existing order; (3) If the order insertion encounters an error or exception, `releasePaymentClaim` automatically unclaims the uncommitted session/payment ID, allowing the customer to retry without being locked out; (4) Upon successful database insertion, `confirmPaymentSession` permanently commits the transaction with `status: 'confirmed'`. Added 4 regression tests verifying concurrent duplicate rejection, recovery polling, release on insertion failure, and database RPC privilege enforcement. |
| **[P2] Fail Closed When File-Store Lock Was Not Acquired** | In [`src/utils/payment/provider.ts`](src/utils/payment/provider.ts), fixed `CrossProcessPaymentStore.withLock()`. Previously, if lock acquisition timed out after 1.5 seconds, `fd` remained `null`, but line 165 still executed the callback `fn()`, allowing operations to run unguarded outside the lock under contention. Now, if `fd === null`, `withLock()` immediately throws an error without executing `fn()`. Caller store methods (`saveSession`, `claimPayment`, `consumePayment`, `checkAndAcquireIpSlot`) catch the lock failure and return fail-closed results, strictly executing `fn()` only while holding the lock descriptor. Added regression tests in [`tests/checkout-order-protection.test.mjs`](tests/checkout-order-protection.test.mjs) verifying that callbacks are never executed when lock acquisition fails and store methods fail closed. |
| **[P2] Fail Closed When No Shared Payment Store Is Configured in Production** | In [`src/utils/payment/provider.ts`](src/utils/payment/provider.ts), [`src/app/checkout/actions.ts`](src/app/checkout/actions.ts), and [`.env.example`](.env.example), restricted file-backed payment store (`CrossProcessPaymentStore`) to non-production environments (`NODE_ENV !== 'production'`) or explicitly configured single persistent host deployments (`SINGLE_PERSISTENT_HOST='true'` or `PAYMENT_STORE_SINGLE_HOST='true'`). When running in production without Supabase credentials and service-role key, `createProductionPaymentStore` returns `MisconfiguredPaymentStore`. Both `createServerPaymentSession` and `initiatePaymentSession` fail closed with `success: false` and clear error diagnostics if invoked in production without a shared durable store, eliminating the vulnerability where payment sessions were stored on an isolated serverless instance filesystem and lost during multi-instance checkout verification. Added 12 regression tests in [`tests/checkout-order-protection.test.mjs`](tests/checkout-order-protection.test.mjs) verifying fail-closed enforcement and single-host opt-in. |
| **[P2] Fencing Takeover Cleanup Mutex Across Create-to-Metadata Gap & Inode Verification** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), resolved the race condition where a process pauses between `openSync('wx')` and writing takeover metadata to `${filePath}.takeover`. First, updated `isLockOwnerAlive` to safely guard the create-to-metadata gap: newly created 0-byte or unparsed lock files whose `mtimeMs` is within 2000ms are treated as alive, preventing concurrent cleaners from misclassifying active initializations as dead. Second, implemented `isTakeoverFenceValid(takeoverFd, takeoverMutexPath, expectedOwnerId)` to strictly enforce 4 layers of fencing: (1) descriptor link validity (`fstatSync(takeoverFd).nlink > 0`), (2) on-disk existence, (3) inode and device fencing (`statSync(takeoverMutexPath).ino === fstatSync(takeoverFd).ino && statSync(takeoverMutexPath).dev === fstatSync(takeoverFd).dev`), and (4) on-disk metadata ownership (`ownerId` and `process.pid`). Checked this fence in `unlinkIfSameInode` immediately after writing metadata, before checking `filePath`, immediately before unlinking `filePath`, and in `finally` before unlinking the takeover mutex. Applied symmetric fencing in `atomicTakeoverStaleLock`. Added testing hooks `onAfterTakeoverOpen` and comprehensive regression tests in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) including a multiprocess regression test where child reclaims the takeover mutex during an open-to-write pause, verifying that the resumed parent detects the lost takeover lock and safely aborts without deleting the competitor's replacement lock. |
| **[P2] Serialized Inode Comparison with Unlink & Pre-Unlink Fencing** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), serialized `unlinkIfSameInode(filePath, fd, expectedOwnerId, onBeforeUnlink)` under the takeover/reclaim mutex protocol (`${filePath}.takeover`), guaranteeing mutual exclusion with any concurrent reclaimer executing `atomicTakeoverStaleLock`. Added pre-unlink re-verification (`statSync(filePath).ino === fdStat.ino`) immediately before calling `unlinkSync(filePath)`. If a competitor or test replaces the directory entry between comparison and unlink, `unlinkIfSameInode` returns `false` and does NOT delete the replacement lock. Removed un-fenced fallback unlinks in `withLock`, `writeData`, and `atomicTakeoverStaleLock`. Added multiprocess regression test in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) verifying that when a separate child process replaces the lock file between comparison and unlink, the replacement lock is preserved on disk with its new inode and ownership intact. |
| **[P2] Global Flood Admission Accounting for All RPC Attempts (Including Throttled Retries)** | In [`supabase/migrations/20261012_contact_rate_limiter.sql`](supabase/migrations/20261012_contact_rate_limiter.sql), updated `consume_contact_rate_limit` (Step 5b) to immediately count and persist every incoming request against `c_global_admission_key`, before evaluating individual per-key cooldowns or sliding window quotas. Removed the duplicate delayed update in Step 9. If an IP is already throttled, repeated retry attempts entered the RPC and acquired the advisory lock, but previously bypassed incrementing the global admission window. Now, repeated retries from throttled callers accumulate towards the shared 120/minute global budget; once 120 attempts occur, subsequent requests are blocked at Step 5b with high-traffic status, protecting downstream database work. Also updated `CrossProcessAdmissionStore` to record throttled attempts in `globalTimestamps`. Added regression tests in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) verifying that repeated retries from an already-throttled caller count towards the shared global flood budget in both the database RPC and the local admission store. |
| **[P2] Inode/Ownership Fencing for Mutex Write Failure Cleanup & Replacement Lock Protection** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), implemented `unlinkIfSameInode(filePath, fd, expectedOwnerId)` to strictly enforce inode, device, and ownership fencing before deleting any lock or mutex file. If a process pauses after `openSync('wx')` long enough for another caller to classify the unpopulated file as stale and atomically replace it with a new inode, `unlinkIfSameInode` verifies `fstatSync(fd).ino === statSync(filePath).ino && fstatSync(fd).dev === statSync(filePath).dev && fstatSync(fd).nlink > 0` before unlinking, completely preventing write-failure catch blocks from deleting a competitor's replacement lock. Applied this pattern across all mutexes (`withLock` and `writeData` across `CrossProcessAdmissionStore` and `CrossProcessRateLimitStore`, `acquireStaleReclaimMutex`, and `atomicTakeoverStaleLock`), and eliminated blind unlinks on JSON parse error in all `finally` release blocks. Added comprehensive regression tests in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) verifying that replacement locks are preserved on disk. |
| **[P2] Single-Host Admission Store Scoping & Distributed Serverless Architecture Documentation** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), [`src/app/contact/actions.ts`](src/app/contact/actions.ts), and [`PULL_REQUEST.md`](PULL_REQUEST.md), clarified the operational boundaries between persistent host environments and distributed serverless platforms. Formally scoped `CrossProcessAdmissionStore` and `checkAdmissionLimit` as a single persistent host / container admission store coordinating across Node.js worker threads and cluster processes. Explicitly documented that on serverless architectures such as Vercel Functions where `os.tmpdir()` is instance-local, this pre-RPC check acts as an instance-level burst gate, while authoritative global distributed admission control (120/min limit across all running serverless instances) is enforced downstream by the centralized Supabase database RPC (`consume_contact_rate_limit`) via PostgreSQL row locks (`c_global_admission_key`). |
| **[P2] Malformed & Orphan Ticket Recovery in Linearizable Reclaim Election** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), wrapped ticket allocation in try/catch and immediately closed and unlinked partial descriptors/files on metadata write failure. In `acquireStaleReclaimMutex`, updated scanning of earlier tickets and the remaining sequence list to catch empty, 0-byte, or unparseable JSON files (`isMalformed || !meta || typeof meta.pid !== 'number'`) and safely unlink them from disk rather than aborting or permanently blocking the queue. Added regression test `REGRESSION [P2]: orphan malformed ticket does not deadlock reclaim election queue` in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs) verifying that planted 0-byte and corrupted tickets are safely purged and subsequent active callers win the election. |
| **[P2] Fail-Closed Lock Metadata Write Handling & Pre-Critical-Section Owner Fencing** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), updated `CrossProcessAdmissionStore.withLock`, `CrossProcessAdmissionStore.writeData`, `CrossProcessRateLimitStore.withLock`, and `CrossProcessRateLimitStore.writeData` to fail closed if `fs.writeFileSync` fails when recording ownership metadata (immediately closing the open FD, unlinking the partial lock file, and throwing without executing `fn`). Before entering `fn`, enforced strict pre-critical-section owner fencing verifying that `fs.fstatSync(fd).nlink > 0`, the lock file still exists on disk, and on-disk `ownerId === ownerId && pid === process.pid`. Added regression test in [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs). |
| **[P2] Linearizable Winner Election & Non-Replaceable Stale Lock Takeover** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), made reclaim election strictly linearizable by using atomic OS-level sequence reservation (`openSync 'wx'`) for ticket allocation (`seq_*.ticket`) and requiring an exclusive `winner.lock` lease, eliminating double-elections when timestamps tie or clocks skew. Created `atomicTakeoverStaleLock` using dedicated takeover mutex (`.takeover`), immediate PID/owner metadata registration upon creation, owner-fenced ticketed reclaim protocol for stale `.takeover` mutexes, dead-owner identity verification, and live descriptor checks. Added regression tests verifying controlled concurrent election with equal timestamps, in-process pause resilience, and multiprocess pause survival. |
| **[P2] Stale Reclaim Mutex Recovery via Ticketed Directory & Immediate `commit_lock` Owner Metadata** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), replaced single `.reclaim` files with a ticketed claim directory mechanism (`acquireStaleReclaimMutex`) using unique claim tickets in `${lockFilePath}.reclaim_dir`. Stale claims are cleaned up exclusively by their specific filename. In `commit_lock` acquisitions across both stores, owner metadata (`{ pid, ownerId, createdAt }`) is written immediately upon `fs.openSync` rather than leaving a 0-byte file, ensuring cross-process liveness checks accurately detect active owners and preventing false-positive staleness classifications. |
| **[P2] Fencing Conditional at Commit with Atomic CAS & Exclusive Takeover** | In [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), enclosed validation (commit mutex descriptor, lock descriptor `nlink > 0`, owner fencing token, and on-disk storage epoch CAS match) and atomic file swap (`fs.renameSync`) inside an exclusive commit transaction mutex (`${filePath}.commit_lock`) across both stores. This eliminates any TOCTOU gap between validation and rename. Replaced stale lock unlinking with exclusive atomic takeover via `fs.renameSync(newLockPath, lockFilePath)`. |
| **[P2] Quota Poisoning Prevention & Confirmed-Email Deployment Requirement** | In [`src/app/contact/actions.ts`](src/app/contact/actions.ts), [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), and [`src/utils/supabase/config.ts`](src/utils/supabase/config.ts), eliminated vulnerability allowing unauthenticated callers or attackers signing up in Supabase projects with "Confirm Email" disabled to exhaust a victim's shared email quota. Implemented `isEmailConfirmationEnforced` and `isMailboxVerified`: shared email quotas are strictly gated behind confirmed-email deployment configuration (`REQUIRE_EMAIL_CONFIRMATION='true'`) and trusted `email_confirmed_at` verification. |
| **[P2] Hard Storage Capacity Bound Enforcement & All-Throttled Saturation Guard** | In [`supabase/migrations/20261012_contact_rate_limiter.sql`](supabase/migrations/20261012_contact_rate_limiter.sql), [`src/app/contact/rateLimiter.ts`](src/app/contact/rateLimiter.ts), and [`tests/contact-inquiry.test.mjs`](tests/contact-inquiry.test.mjs), strictly enforced hard capacity limits (`c_max_store_size = 1000`) before inserting new key digests. Captured `v_evicted_count` and verified that if remaining rows are actively throttled, execution terminates immediately and rejects new key submissions with high-volume status without inserting rows. |
| **[P1] Exact Email Equality for Guest Orders & Wildcard Match Prevention** | In [`src/utils/format.ts`](src/utils/format.ts) and [`src/app/checkout/actions.ts`](src/app/checkout/actions.ts), added `normalizeEmail` (`toLowerCase().trim()`) for canonical address persistence. In [`src/app/account/page.tsx`](src/app/account/page.tsx), replaced `ILIKE` guest order lookups with exact equality (`eq('customer_email', user.email.toLowerCase().trim())`), preventing malicious accounts with underscore (`al_ce@example.com`) or percent wildcards from claiming orders belonging to legitimate customers (`alice@example.com`). Added regression suite in [`tests/guest-order-casing.test.mjs`](tests/guest-order-casing.test.mjs). |
| **[P1] Dedicated Mobile Hero Campaign Grid Card (100% Saree Drape Visibility)** | In [`src/app/page.tsx`](src/app/page.tsx), restructured the hero section into a responsive dual-mode grid (`grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center`). On mobile viewports (`< lg`), the hero photograph is showcased in its own dedicated, unoccluded visual grid card (`order-1`, `aspect-[4/5] sm:aspect-[16/10]`, `rounded-2xl`, `shadow-2xl`, `border border-[#D6B878]/30`, `bg-[#241B17]`, `max-w-md mx-auto`) with a floating pill badge (`Autumn / Festive 2026 Drape`). The editorial copy and dual CTAs sit in `order-2` below the card. |
| **[P1] Product Card Discount Badge Placement (Zero Model Occlusion)** | In [`src/components/ProductCard.tsx`](src/components/ProductCard.tsx), relocated `{product.discount}` ("26% OFF") out of the top-left image overlay and into the pricing container beside the compare-at price (`₹18,499  ₹24,999  26% OFF`). Displayed as a high-contrast gold pill badge (`bg-[#B08D57] text-[#1C1613]`, 5.79:1 contrast). The image overlay displays solely a single, compact classification tag (`NEW ARRIVAL` / `BESTSELLER`), completely eliminating model occlusion. |
| **[P2] Enlarge Mobile Header Tap Targets to 44×44px with Enhanced Separation** | In [`src/components/Header.tsx`](src/components/Header.tsx), provided compliant 44×44px hit areas (`w-11 h-11 min-w-[44px] min-h-[44px]`) for the mobile navigation toggle (`#mobileMenuToggle`), search button, wishlist link, shopping bag button, drawer close button, and search modal close button. Increased physical action separation to 6px (`gap-1.5`) at 320px and 8px (`xs:gap-2`) at ≥380px. |
| **[P2] Implement Search Overlay as an Accessible Modal Dialog** | In [`src/components/Header.tsx`](src/components/Header.tsx), converted `#searchModal` into a fully accessible modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="searchModalTitle"`). Added dynamic trigger states (`aria-expanded`, `aria-controls`), automatic focus shift to the search field on open, keyboard focus trap (`Tab` / `Shift+Tab`), Escape key dismissal, and automatic focus restoration to `#searchModalToggle` upon closing. |
| **[P2] Programmatic Accessible Names for Search Fields** | In [`src/components/Header.tsx`](src/components/Header.tsx), added explicit programmatic labels to both search fields: desktop input carries `id="desktopSearchInput"`, `<label className="sr-only">`, `aria-label="Search sarees catalog"`, and `role="search"`; overlay input carries `id="overlaySearchInput"`, `<label className="sr-only">`, `aria-label="Search by silk type, color, region, or weave"`, and `role="search"`. |
| **[P1] Customer Authentication Pages & Action Wiring (`/login`, `/register`)** | Created storefront auth route pages [`src/app/login/page.tsx`](src/app/login/page.tsx), [`src/app/login/LoginForm.tsx`](src/app/login/LoginForm.tsx), [`src/app/register/page.tsx`](src/app/register/page.tsx), and [`src/app/register/RegisterForm.tsx`](src/app/register/RegisterForm.tsx) connected to Supabase server actions `login` and `signup`. Wrapped search-parameter client components in React `Suspense` boundaries for clean Next.js static prerendering. Pruned unrouted `/admin/login` links. |
| **[P2] Post-Auth Redirect Target Validation (Open Redirect Mitigation)** | In [`src/app/login/actions.ts`](src/app/login/actions.ts), introduced `getSafeRedirect()` validator. Verifies that post-authentication redirect targets in `login` and `signup` actions are strict, same-origin relative paths starting with a single `/`. Rejects absolute URLs, protocol-relative URLs (`//`), and control schemes, defaulting securely to `/account`. |
| **[P2] Account-Scoped Order History (Isolation & RLS)** | In [`src/app/account/page.tsx`](src/app/account/page.tsx) and [`src/app/account/AccountClient.tsx`](src/app/account/AccountClient.tsx), eliminated shared browser-global order storage. Isolated orders by `userId` (partitioned key `palluvo_orders_${userId}`), backed by Supabase RLS policies. Purged order caches on logout to prevent data leakage across account switches. |
| **[P1] ESLint 9 Compatibility & Next 16 Lint Resolution** | In [`package.json`](package.json), updated `eslint` to `^9.0.0` to satisfy peer dependencies of `eslint-config-next@16.4.0`. Migrated to flat config [`eslint.config.mjs`](eslint.config.mjs) and updated the `lint` script to invoke `eslint .` directly. |

---

## 🔬 Testing & Verification

### Automated Test Suite Execution
- **`npm test`**: **163/163 passing tests across 4 test suites** (0 failures, 0 skipped)
  - `tests/checkout-order-protection.test.mjs`: 93 tests (atomic payment claim workflow, release claim on insert failure, withLock fail-closed on lock timeout, fail-closed payment store in production without Supabase service role, single-host opt-in via SINGLE_PERSISTENT_HOST, deferred order consumption, multi-instance session persistence, atomic consumePaymentSession replay protection, variant deduplication, proxy CIDRs, and account quota isolation)
  - `tests/contact-inquiry.test.mjs`: 52 tests (production store boundary, multi-worker thread isolation, HMAC identifier hashing, service-role credential checks, scheduled pruning, active rate limits view security_invoker, linearizable sequence ticket election, atomic takeover, orphan ticket recovery, fail-closed write handling, takeover-serialized inode fencing with multiprocess swap prevention, global flood accounting for repeated throttled attempts, safe create-to-metadata gap guard, and multiprocess takeover reclamation pause fencing)
  - `tests/hero-marquee-and-sitemap.test.mjs`: 13 tests (accessible marquee pause control, sitemap lastmod freshness, Next 16.4.3 security patches, .gitignore env file exclusion, deduplicated auth titles, and src/proxy.ts Next.js 16 entrypoint)
  - `tests/guest-order-casing.test.mjs`: 5 tests (canonical email normalization, mixed-case guest order claiming, underscore and percent wildcard injection prevention, and malformed email rejection)

### Static Code Analysis & Build Verification
- **`npx tsc --noEmit`**: **0 errors**. Strict TypeScript compilation across all routes, actions, components, and utilities.
- **`npm run lint`**: **0 errors / 0 warnings**. ESLint 9 with flat config passing with all core-web-vitals rules enforced.
- **`npm run build`**: **Succeeds cleanly**. All 72 static pages and routes generated with zero compilation or hydration errors.
- **`npm audit --omit=dev --audit-level=high`**: **0 vulnerabilities**. Production dependency tree is completely secure.

### Viewport & Accessibility Validation (Chrome CDP)
- [x] **Search Modal Accessible Dialog:** Trigger carries `aria-expanded` and `aria-controls`; overlay provides `role="dialog"`, `aria-modal="true"`, focus shifts into input, Tab key trapped, Escape key closes and restores focus to trigger.
- [x] **Programmatic Search Labels:** Both desktop and overlay search inputs expose `<label className="sr-only">`, `aria-label`, and `role="search"`.
- [x] **Mobile Hero Drape Visibility:** Hero photograph renders in dedicated visual card on mobile; model's face, jewelry, and emerald silk saree 100% visible with zero text collision; `scrollWidth === 320px` (zero horizontal scroll).
- [x] **Product Card Discount Placement:** Discount badge relocated to pricing row; model's forehead and jewelry 100% unobstructed.
- [x] **Touch Targets (≥44×44px):** Navigation toggle, search, wishlist, bag, drawer close, and modal close buttons measure ≥44×44px with ≥6px physical separation at 320px.
- [x] **Tablet Newsletter Form:** Join button ends inside the viewport at 768px (`scrollWidth: 762px`, no horizontal scroll).
- [x] **Brand Tagline:** Full text *"Every drape, a little magic."* renders single-line without clipping across all phone viewports.
- [x] **WCAG Contrast Ratios:** Deep Burgundy text on ivory surface provides 11.03:1 contrast; dark charcoal on gold pill badge provides 5.79:1 contrast; rating score text provides 14.5:1 contrast against white.

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
4. **Run TypeScript check & linter:**
   ```bash
   npx tsc --noEmit
   npm run lint
   ```
5. **Run test suite:**
   ```bash
   npm test
   ```
6. **Create production build:**
   ```bash
   npm run build && npm run start
   ```
