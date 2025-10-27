import { Metadata } from 'next';

import { BenefitsSection } from './components/benefits-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';

export const metadata: Metadata = {
  title: 'Enabling Collaboration | Kosuke Solutions',
  description:
    'Empower your entire team to ship features without coding skills. Non-technical team members can build and deploy while engineers maintain control and quality.',
};

export default function EnablingCollaborationPage() {
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
