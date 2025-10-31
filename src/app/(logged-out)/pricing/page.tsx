import { Metadata } from 'next';
import Script from 'next/script';

import { ComparisonSection } from './components/comparison-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { faqItems } from './data/faq-data';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export const metadata: Metadata = {
  title: 'Pricing | Kosuke',
  description:
    'Compare Kosuke with other AI coding platforms and traditional software agencies. See how we deliver agency-level quality at AI platform prices with transparent pricing.',
  alternates: {
    canonical: `${baseUrl}/pricing`,
  },
};

export default function PricingPage() {
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Script
        id="pricing-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <HeroSection />
      <ComparisonSection />
      <CTASection />
      <FAQSection />
    </>
  );
}
