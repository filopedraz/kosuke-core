import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { getCustomers } from '@/lib/ghost/client';

export const metadata: Metadata = {
  title: 'Customers | Kosuke',
  description:
    'Discover how leading companies use Kosuke to ship better products faster with AI-powered development.',
};

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-screen-2xl mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Trusted by innovative teams
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            See how leading companies are using Kosuke to transform their development workflow and
            ship products faster than ever before.
          </p>
        </div>
      </section>

      {/* Customers Grid */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-screen-2xl mx-auto">
        {customers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No customer stories available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {customers.map(customer => (
              <Link
                key={customer.id}
                href={`/customers/${customer.slug}`}
                className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-lg"
              >
                {customer.featureImage && (
                  <div className="relative w-full h-48 bg-muted overflow-hidden">
                    <Image
                      src={customer.featureImage}
                      alt={customer.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {customer.title}
                  </h2>
                  {customer.excerpt && (
                    <p className="text-muted-foreground text-sm line-clamp-3">{customer.excerpt}</p>
                  )}
                  <div className="mt-4 text-sm text-primary font-medium">Read case study →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
