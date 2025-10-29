'use client';

import { HowItWorksSection } from '@/app/(logged-out)/home/components/how-it-works-section';
import { CTASection } from '@/app/(logged-out)/home/components/cta-section';
import { FAQSection } from '@/app/(logged-out)/home/components/faq-section';
import { FeaturesBentoGrid } from '@/app/(logged-out)/home/components/features-bento-grid';
import { HeroSection } from '@/app/(logged-out)/home/components/hero-section';
import { PrivateAlphaModal } from '@/app/(logged-out)/home/components/private-alpha-modal';
import { ReviewsMarquee } from '@/app/(logged-out)/home/components/reviews-marquee';
import { useEffect, useState } from 'react';

export function Home() {
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
      <HowItWorksSection />

      {/* Bento Grid Features */}
      <FeaturesBentoGrid />

      {/* Private Alpha CTA */}
      <CTASection onApplyClick={() => setIsModalOpen(true)} />

      {/* Reviews Section */}
      <ReviewsMarquee />

      {/* FAQ Section */}
      <FAQSection />

      {/* Private Alpha Modal */}
      <PrivateAlphaModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
