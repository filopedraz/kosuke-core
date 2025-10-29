import { Metadata } from 'next';
import Script from 'next/script';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { FAQSection, faqItems } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export const metadata: Metadata = {
  title: 'Ship with Engineers | Kosuke Solutions',
  description:
    'Get dedicated senior engineers building production-ready software for your startup. Real accountability, transparent pricing, and shipped products at the price of vibe coding.',
  alternates: {
    canonical: `${baseUrl}/solutions/ship-with-engineers`,
  },
};

export default function ShipWithEngineersPage() {
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
        id="ship-with-engineers-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
      <FAQSection />
    </>
  );
}
