'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

import { CTASection } from './components/cta-section';
import { FAQSection } from './components/faq-section';
import { FeaturesBentoGrid } from './components/features-bento-grid';
import { HeroSection } from './components/hero-section';
import { HowItWorksSection } from './components/how-it-works-section';
import { PrivateAlphaModal } from './components/private-alpha-modal';
import { ReviewsMarquee } from './components/reviews-marquee';
import { faqItems } from './data/faq-data';

export default function KosukePlatformPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

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
        id="kosuke-platform-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <div className="w-full min-h-screen bg-background font-sans">
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

        <HeroSection onApplyClick={() => setIsModalOpen(true)} />
        <HowItWorksSection />
        <FeaturesBentoGrid />
        <CTASection onApplyClick={() => setIsModalOpen(true)} />
        <ReviewsMarquee />
        <FAQSection />
        <PrivateAlphaModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </>
  );
}
