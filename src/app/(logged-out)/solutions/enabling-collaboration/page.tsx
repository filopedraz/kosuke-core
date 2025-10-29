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
  title: 'Enabling Collaboration | Kosuke Solutions',
  description:
    'Empower your entire team to ship features without coding skills. Non-technical team members can build and deploy while engineers maintain control and quality.',
  alternates: {
    canonical: `${baseUrl}/solutions/enabling-collaboration`,
  },
};

export default function EnablingCollaborationPage() {
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
        id="enabling-collaboration-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <HeroSection />
      <HowItWorksSection />
      <BenefitsSection />
      <CTASection />
      <FAQSection />
    </>
  );
}
