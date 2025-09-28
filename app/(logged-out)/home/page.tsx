'use client';

import { useEffect, useState } from 'react';
import { CoreFeaturesSection } from './components/core-features-section';
import { CoreValuesSection } from './components/core-values-section';
import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { FeaturesBentoGrid } from './components/features-bento-grid';
import { HeroSection } from './components/hero-section';
import { PrivateAlphaModal } from './components/private-alpha-modal';
import { ReviewsMarquee } from './components/reviews-marquee';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full min-h-screen bg-background font-mono">
      {/* Minimal background with subtle grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Hero Section */}
      <HeroSection onApplyClick={() => setIsModalOpen(true)} />

      {/* Core Features */}
      <CoreFeaturesSection />

      {/* Bento Grid Features */}
      <FeaturesBentoGrid />

      {/* Reviews Section */}
      <ReviewsMarquee />

      {/* Core Values Section */}
      <CoreValuesSection />

      {/* Private Alpha CTA */}
      <CTASection onApplyClick={() => setIsModalOpen(true)} />

      {/* FAQ Section */}
      <FAQSection />

      {/* Private Alpha Modal */}
      <PrivateAlphaModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
