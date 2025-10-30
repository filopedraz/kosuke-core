import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';

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

  // Since we're not displaying the excerpt separately, use the original HTML
  const processedHtml = customer.html;

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
        <article
          className="max-w-4xl mx-auto prose prose-lg dark:prose-invert
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
            prose-h1:text-4xl prose-h1:font-extrabold prose-h1:mb-6 prose-h1:mt-12 prose-h1:leading-tight
            prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-12 prose-h2:leading-tight
            prose-h3:text-2xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10 prose-h3:leading-snug
            prose-h4:text-xl prose-h4:font-semibold prose-h4:mb-3 prose-h4:mt-8
            prose-p:text-base prose-p:leading-relaxed prose-p:mb-6 prose-p:text-muted-foreground
            prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:font-semibold prose-strong:text-foreground
            prose-ul:my-8 prose-ul:list-disc prose-ul:pl-8 prose-ul:space-y-3
            prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-8 prose-ol:space-y-3
            prose-li:leading-relaxed prose-li:my-2
            prose-img:rounded-lg prose-img:shadow-md prose-img:my-8 prose-img:mx-auto
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-muted-foreground
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-foreground
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border
            [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:mb-6 [&_h1]:mt-12 [&_h1]:text-foreground
            [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-6 [&_h2]:mt-12 [&_h2]:text-foreground
            [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-10 [&_h3]:text-foreground
            [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:mb-3 [&_h4]:mt-8 [&_h4]:text-foreground
            [&_p]:mb-6
            [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-8 [&_ul]:space-y-3
            [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-8 [&_ol]:space-y-3
            [&_li]:leading-relaxed [&_li]:my-2
            [&_ul>li]:list-disc [&_ul>li]:ml-0
            [&_ol>li]:list-decimal [&_ol>li]:ml-0
            [&_img]:mx-auto [&_img]:block"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </section>
    </div>
  );
}
