import { Metadata } from 'next';
import Script from 'next/script';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { FAQSection, faqItems } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export const metadata: Metadata = {
  title: 'Startup Program | Kosuke Solutions',
  description:
    'Ship your MVP for free with Kosuke Startup Program. We build high-quality MVPs at no upfront cost for selected startups. Apply now to get started.',
  alternates: {
    canonical: `${baseUrl}/solutions/startup-program`,
  },
};

export default function VentureBuilderPage() {
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
        id="startup-program-faq-structured-data"
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
