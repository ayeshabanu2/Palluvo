import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SAREE_PRODUCTS } from '@/data/products';
import ProductDetailContent from './ProductDetailContent';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const params: { slug: string }[] = [];
  SAREE_PRODUCTS.forEach((product) => {
    if (product.slug) {
      params.push({ slug: product.slug });
    }
    if (product.id && product.id !== product.slug) {
      params.push({ slug: product.id });
    }
  });
  return params;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = SAREE_PRODUCTS.find((p) => p.slug === slug || p.id === slug);

  if (!product) {
    return {
      title: 'Saree Not Found',
      description: 'The requested luxury handloom saree drape could not be found.',
    };
  }

  const title = product.name;
  const brandTitle = `${product.name} | PALLUVO Luxury Sarees`;
  const description =
    product.description ||
    product.tagline ||
    `Discover ${product.name}, an authentic handloom ${product.sareeType} saree certified with pure silk mark guarantee.`;
  const primaryImage = product.images && product.images[0] ? `/${product.images[0]}` : '/images/hero_campaign.jpg';
  const canonicalUrl = `https://palluvo.com/product/${product.slug || product.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: brandTitle,
      description,
      url: canonicalUrl,
      siteName: 'PALLUVO',
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 1067,
          alt: product.name,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandTitle,
      description,
      images: [primaryImage],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const product = SAREE_PRODUCTS.find((p) => p.slug === slug || p.id === slug);

  if (!product) {
    notFound();
  }

  const primaryImage = product.images && product.images[0] ? `https://palluvo.com/${product.images[0]}` : 'https://palluvo.com/images/hero_campaign.jpg';
  const productUrl = `https://palluvo.com/product/${product.slug || product.id}`;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: primaryImage,
    description: product.description || product.tagline,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'PALLUVO',
    },
    category: product.sareeType,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: product.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'PALLUVO',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || '4.9',
      reviewCount: product.reviewsCount || 28,
      bestRating: '5',
      worstRating: '1',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://palluvo.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Sarees',
        item: 'https://palluvo.com/sarees',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailContent product={product} />
    </>
  );
}
