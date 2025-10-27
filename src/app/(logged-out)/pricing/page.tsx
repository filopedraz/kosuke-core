import { Metadata } from 'next';

import { ComparisonSection } from './components/comparison-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { HeroSection } from './components/hero-section';

export const metadata: Metadata = {
  title: 'Pricing | Kosuke',
  description:
    'Compare Kosuke with other AI coding platforms and traditional software agencies. See how we deliver agency-level quality at AI platform prices with transparent pricing.',
};

export default function PricingPage() {
  return (
    <>
      <HeroSection />
      <ComparisonSection />
      <CTASection />
      <FAQSection />
    </>
  );
}
