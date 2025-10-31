import { Home } from '@/components/home';
import type { Metadata } from 'next';
import Script from 'next/script';

import { HomepageStructuredData } from '../page';
import { faqItems } from './data/faq-data';

export const metadata: Metadata = {
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default function HomePage() {
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
      <HomepageStructuredData />
      <Script
        id="homepage-faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <Home />
    </>
  );
}
