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
      title: 'Saree Not Found | PALLUVO',
      description: 'The requested luxury handloom saree drape could not be found.',
    };
  }

  const title = `${product.name} | PALLUVO Luxury Sarees`;
  const description =
    product.description ||
    product.tagline ||
    `Discover ${product.name} — authentic handloom ${product.sareeType} saree certified with pure silk mark guarantee.`;
  const primaryImage = product.images && product.images[0] ? `/${product.images[0]}` : '/images/hero_campaign.jpg';
  const canonicalUrl = `https://palluvo.com/product/${product.slug || product.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
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
      title,
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

  return <ProductDetailContent product={product} />;
}
