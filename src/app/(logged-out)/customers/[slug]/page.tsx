import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import { GhostHtmlContent } from '@/components/ghost-html-content';
import { Button } from '@/components/ui/button';
import { getCustomerBySlug, getCustomers } from '@/lib/ghost/client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const customer = await getCustomerBySlug(slug);

  if (!customer) {
    return {
      title: 'Customer Not Found | Kosuke',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';
  const images = customer.featureImage ? [customer.featureImage] : undefined;

  return {
    title: `${customer.metaTitle || customer.title} | Kosuke`,
    description: customer.metaDescription || customer.excerpt || undefined,
    alternates: {
      canonical: `${baseUrl}/customers/${slug}`,
    },
    openGraph: {
      title: `${customer.metaTitle || customer.title}`,
      description: customer.metaDescription || customer.excerpt || undefined,
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${customer.metaTitle || customer.title}`,
      description: customer.metaDescription || customer.excerpt || undefined,
      images,
    },
  };
}

export async function generateStaticParams() {
  const customers = await getCustomers();

  return customers.map(customer => ({
    slug: customer.slug,
  }));
}

export default async function CustomerDetailPage({ params }: Props) {
  const { slug } = await params;
  const customer = await getCustomerBySlug(slug);

  if (!customer) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

  const caseStudyStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: customer.title,
    description: customer.excerpt || customer.metaDescription || undefined,
    image: customer.featureImage || undefined,
    datePublished: customer.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'Kosuke',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kosuke',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/customers/${slug}`,
    },
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <Script
        id="customer-case-study-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(caseStudyStructuredData),
        }}
      />
      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pt-8 pb-12 md:pb-16 max-w-screen-2xl mx-auto">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/customers" className="inline-block mb-6">
            <Button variant="ghost" size="sm" className="gap-2 -ml-3">
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {customer.title}
          </h1>
          {customer.featureImage && (
            <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden">
              <Image
                src={customer.featureImage}
                alt={customer.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-screen-2xl mx-auto">
        <GhostHtmlContent html={customer.html} className="max-w-4xl mx-auto" />
      </section>
    </div>
  );
}
