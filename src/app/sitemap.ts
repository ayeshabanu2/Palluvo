import { MetadataRoute } from 'next';
import { SAREE_PRODUCTS } from '@/data/products';

// Last significant content update timestamps for core static routes.
// Google Search Central advises that lastmod must reflect the page's actual
// last significant update and should be omitted when no reliable timestamp exists.
const STATIC_ROUTE_LAST_MODIFIED: Record<string, string> = {
  root: '2026-10-07',
  sarees: '2026-10-07',
  about: '2026-10-07',
  contact: '2026-10-07',
};

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://palluvo.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(STATIC_ROUTE_LAST_MODIFIED.root),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sarees`,
      lastModified: new Date(STATIC_ROUTE_LAST_MODIFIED.sarees),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(STATIC_ROUTE_LAST_MODIFIED.about),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(STATIC_ROUTE_LAST_MODIFIED.contact),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // For products, only assign lastModified when an authentic product update timestamp exists;
  // otherwise omit lastModified to avoid emitting unreliable timestamps across deployments.
  const productRoutes: MetadataRoute.Sitemap = SAREE_PRODUCTS.map((product) => {
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${baseUrl}/product/${product.slug || product.id}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    };

    if (product.updatedAt) {
      entry.lastModified = new Date(product.updatedAt);
    }

    return entry;
  });

  return [...staticRoutes, ...productRoutes];
}
