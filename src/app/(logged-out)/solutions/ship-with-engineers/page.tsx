import { Metadata } from 'next';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

export const metadata: Metadata = {
  title: 'Ship with Engineers | Kosuke Solutions',
  description:
    'Get dedicated senior engineers building production-ready software for your startup. Real accountability, transparent pricing, and shipped products at the price of vibe coding.',
};

export default function ShipWithEngineersPage() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
    </>
  );
}
