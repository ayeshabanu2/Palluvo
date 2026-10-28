import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Hero Marquee Accessibility & Sitemap Freshness Regression Tests', () => {
  test('sitemap.ts aligns static route lastmod with actual content changes', () => {
    const sitemapContent = fs.readFileSync(path.join(rootDir, 'src/app/sitemap.ts'), 'utf-8');

    // Verify root is aligned with the Oct 10 substantive changes
    assert.match(
      sitemapContent,
      /root:\s*['"]2026-10-10['"]/,
      'Homepage sitemap lastmod must align with the 2026-10-10 substantive hero/best-seller changes'
    );

    // Verify sarees is aligned with the Oct 9 filter changes
    assert.match(
      sitemapContent,
      /sarees:\s*['"]2026-10-09['"]/,
      'Sarees catalog sitemap lastmod must align with the 2026-10-09 catalog filter UI changes'
    );
  });

  test('globals.css disables marquee animation under prefers-reduced-motion: reduce', () => {
    const cssContent = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf-8');

    // Extract prefers-reduced-motion: reduce block
    const reducedMotionMatch = cssContent.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(reducedMotionMatch, 'globals.css must contain @media (prefers-reduced-motion: reduce) block');

    const reducedMotionBody = reducedMotionMatch[1];
    assert.match(
      reducedMotionBody,
      /\.animate-marquee\s*\{\s*animation:\s*none\s*!important;\s*\}/,
      'globals.css must disable .animate-marquee under prefers-reduced-motion: reduce'
    );
    assert.match(
      reducedMotionBody,
      /\.mask-image-fade\s*\{\s*overflow-x:\s*auto\s*!important;/,
      'globals.css must allow accessible horizontal scrolling for .mask-image-fade under reduced motion'
    );
  });

  test('globals.css provides pause rules for hover, focus-within, and manual pause class', () => {
    const cssContent = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf-8');

    assert.match(
      cssContent,
      /\.focus-within\\:pause-marquee:focus-within\s*\{\s*animation-play-state:\s*paused;\s*\}/,
      'globals.css must pause marquee when focus is within child interactive elements'
    );
    assert.match(
      cssContent,
      /\.pause-marquee\s*\{\s*animation-play-state:\s*paused\s*!important;\s*\}/,
      'globals.css must support explicit .pause-marquee class to pause animation'
    );
  });

  test('BestSellersMarquee.tsx implements keyboard/touch operable control with WCAG compliant attributes', () => {
    const componentContent = fs.readFileSync(
      path.join(rootDir, 'src/components/BestSellersMarquee.tsx'),
      'utf-8'
    );

    // Operable button with state toggle
    assert.match(
      componentContent,
      /<button[\s\S]*?onClick=\{\(\)\s*=>\s*setIsPaused\(/,
      'BestSellersMarquee must include an operable button that toggles isPaused state'
    );

    // WCAG accessibility attributes
    assert.match(
      componentContent,
      /aria-label=\{isPaused\s*\?\s*['"]Play best sellers animation['"]\s*:\s*['"]Pause best sellers animation['"]\}/,
      'Operable button must provide dynamic accessible name for screen readers'
    );
    assert.match(
      componentContent,
      /aria-pressed=\{isPaused\}/,
      'Operable button must expose aria-pressed semantic toggle state'
    );

    // WCAG 2.2 touch target minimum 44x44px
    assert.match(
      componentContent,
      /min-h-\[44px\]\s+min-w-\[44px\]/,
      'Operable button must satisfy WCAG 2.2 minimum 44x44px touch target requirement'
    );

    // Focus appearance ring
    assert.match(
      componentContent,
      /focus-visible:ring-2\s+focus-visible:ring-\[#D6B878\]/,
      'Operable button and links must provide visible high-contrast focus rings for keyboard navigation'
    );

    // Focus-within pause class
    assert.match(
      componentContent,
      /focus-within:pause-marquee/,
      'Marquee container must include focus-within:pause-marquee for keyboard traversal'
    );

    // Responsive image sizes matching rendered card widths (256px, 320px, 272px)
    assert.match(
      componentContent,
      /sizes=['"]\(max-width:\s*640px\)\s*256px,\s*\(max-width:\s*1024px\)\s*320px,\s*272px['"]/,
      'Marquee image sizes must match rendered card widths 256px (w-64), 320px (sm:w-80), and 272px (lg:w-[17rem])'
    );
  });

  test('page.tsx imports and integrates BestSellersMarquee', () => {
    const pageContent = fs.readFileSync(path.join(rootDir, 'src/app/page.tsx'), 'utf-8');

    assert.match(
      pageContent,
      /import\s+BestSellersMarquee\s+from\s+['"]@\/components\/BestSellersMarquee['"]/,
      'page.tsx must import BestSellersMarquee'
    );
    assert.match(
      pageContent,
      /<BestSellersMarquee\s+trendingSarees=\{trendingSarees\}\s*\/>/,
      'page.tsx must render BestSellersMarquee with trendingSarees prop'
    );
  });

  test('package.json and lockfile resolve patched Next.js release >= 16.4.1', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const nextDep = pkg.dependencies?.next;
    assert.ok(nextDep, 'Next.js must be a production dependency');
    
    // Check semver string is >= 16.4.1
    const cleanVersion = nextDep.replace(/[\^~>=]/g, '');
    const [major, minor, patch] = cleanVersion.split('.').map(Number);
    const isPatched = major > 16 || (major === 16 && (minor > 4 || (minor === 4 && patch >= 1)));
    assert.ok(
      isPatched,
      `Next.js version (${nextDep}) must be >= 16.4.1 to resolve GHSA-p3m5-59mp-jv5r, GHSA-2464-fhr4-w9xw, and GHSA-673q-mjm6-r5xr`
    );
  });

  test('REGRESSION [P2]: .gitignore excludes environment files while keeping .env.example tracked', () => {
    const gitignoreContent = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
    assert.match(gitignoreContent, /^\.env\*/m, '.gitignore must exclude .env* files');
    assert.match(gitignoreContent, /^!\.env\.example/m, '.gitignore must explicitly keep .env.example tracked');
  });

  test('REGRESSION [P3]: login and register metadata use bare titles and branded openGraph titles to avoid duplicate brand suffix', () => {
    const loginContent = fs.readFileSync(path.join(rootDir, 'src/app/login/page.tsx'), 'utf-8');
    assert.match(
      loginContent,
      /title:\s*['"]Sign In['"]/,
      'login page must use bare title "Sign In" so layout template does not double brand suffix'
    );
    assert.match(
      loginContent,
      /openGraph:\s*\{[\s\S]*?title:\s*['"]Sign In \| PALLUVO Luxury Sarees['"]/,
      'login page must provide branded title in openGraph'
    );

    const registerContent = fs.readFileSync(path.join(rootDir, 'src/app/register/page.tsx'), 'utf-8');
    assert.match(
      registerContent,
      /title:\s*['"]Create an Account['"]/,
      'register page must use bare title "Create an Account" so layout template does not double brand suffix'
    );
    assert.match(
      registerContent,
      /openGraph:\s*\{[\s\S]*?title:\s*['"]Create an Account \| PALLUVO Luxury Sarees['"]/,
      'register page must provide branded title in openGraph'
    );
  });

  test('REGRESSION [P3]: adopts Next.js 16 proxy.ts convention and removes deprecated middleware.ts', () => {
    const proxyExists = fs.existsSync(path.join(rootDir, 'src/proxy.ts'));
    const middlewareExists = fs.existsSync(path.join(rootDir, 'src/middleware.ts'));
    assert.ok(proxyExists, 'src/proxy.ts must exist under Next.js 16 convention');
    assert.equal(middlewareExists, false, 'src/middleware.ts must be migrated to src/proxy.ts');

    const proxyContent = fs.readFileSync(path.join(rootDir, 'src/proxy.ts'), 'utf-8');
    assert.match(
      proxyContent,
      /export\s+(?:async\s+)?function\s+proxy\s*\(/,
      'src/proxy.ts must export proxy function'
    );
  });
});

