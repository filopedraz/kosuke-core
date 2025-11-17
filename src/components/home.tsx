'use client';

import { CTASection } from '@/app/(logged-out)/home/components/cta-section';
import { FAQSection } from '@/app/(logged-out)/home/components/faq-section';
import { HeroSection } from '@/app/(logged-out)/home/components/hero-section';
import { ProblemsSection } from '@/app/(logged-out)/home/components/problems-section';
import { SolutionsGridSection } from '@/app/(logged-out)/home/components/solutions-grid-section';

import { useEffect } from 'react';

export function Home() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  return (
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

      {/* Hero Section */}
      <HeroSection />

      {/* Problems Section */}
      <ProblemsSection />

      {/* Solutions Grid */}
      <SolutionsGridSection />

      {/* CTA Section */}
      <CTASection />

      {/* FAQ Section */}
      <FAQSection />
    </div>
  );
}
