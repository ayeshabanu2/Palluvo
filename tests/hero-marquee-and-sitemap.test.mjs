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
});
