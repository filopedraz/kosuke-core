import { Metadata } from 'next';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

export const metadata: Metadata = {
  title: 'On-Premise Deployment | Kosuke Solutions',
  description:
    'Deploy the first open-source vibe coding platform in your own data center. Complete control, maximum security, and zero vendor lock-in for enterprise teams.',
};

export default function OnPremisePage() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CTASection />
    </>
  );
}
