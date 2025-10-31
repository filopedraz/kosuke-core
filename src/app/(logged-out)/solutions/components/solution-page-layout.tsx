'use client';

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type Benefit = {
  title: string;
  description: string;
};

type Feature = {
  title: string;
  description: string;
  icon?: ReactNode;
};

type SolutionPageLayoutProps = {
  title: string;
  subtitle: string;
  description: string;
  benefits: Benefit[];
  features: Feature[];
  ctaTitle?: string;
  ctaDescription?: string;
};

export function SolutionPageLayout({
  title,
  subtitle,
  description,
  benefits,
  features,
  ctaTitle = 'Ready to get started?',
  ctaDescription = 'Join the private alpha and experience the future of software development.',
}: SolutionPageLayoutProps) {
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-screen-2xl mx-auto">
        <div className="max-w-4xl">
          <div className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-6">
            {subtitle}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">{description}</p>
          <Link href="/home">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-screen-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Key Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                  <h3 className="text-xl font-semibold">{benefit.title}</h3>
                </div>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 max-w-screen-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
            >
              {feature.icon && <div className="mb-4 text-primary">{feature.icon}</div>}
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24 bg-muted/30 border-t border-border">
        <div className="max-w-screen-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{ctaTitle}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{ctaDescription}</p>
          <Link href="/home">
            <Button size="lg" className="gap-2">
              Apply for Access
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
