import { ArrowLeft } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

  return {
    title: `${customer.metaTitle || customer.title} | Kosuke`,
    description: customer.metaDescription || customer.excerpt || undefined,
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

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-8 max-w-screen-2xl mx-auto border-border">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </section>

      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-12 md:py-16 max-w-screen-2xl mx-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {customer.title}
          </h1>
          {customer.excerpt && (
            <p className="text-lg md:text-xl text-muted-foreground mb-8">{customer.excerpt}</p>
          )}
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
          className="max-w-4xl mx-auto prose prose-lg dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: customer.html }}
        />
      </section>
    </div>
  );
}
