import { Metadata } from 'next';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

export const metadata: Metadata = {
  title: 'Startup Program | Kosuke Solutions',
  description:
    'Ship your MVP for free with Kosuke Startup Program. We build high-quality MVPs at no upfront cost for selected startups. Apply now to get started.',
};

export default function VentureBuilderPage() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
      <FAQSection />
    </>
  );
}
