import { Metadata } from 'next';
import Script from 'next/script';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';
import { faqItems } from './data/faq-data';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export const metadata: Metadata = {
  title: 'On-Premise Deployment | Kosuke Solutions',
  description:
    'Deploy the first open-source vibe coding platform in your own data center. Complete control, maximum security, and zero vendor lock-in for enterprise teams.',
  alternates: {
    canonical: `${baseUrl}/solutions/on-premise`,
  },
};

export default function OnPremisePage() {
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
        id="on-premise-faq-structured-data"
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
