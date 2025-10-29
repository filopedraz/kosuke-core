import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GhostPageContent } from '@/components/ghost-page-content';
import { getPageById } from '@/lib/ghost/client';

const TERMS_AND_CONDITIONS_PAGE_ID = '68ff5e9479cd1b0001aaa441';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageById(TERMS_AND_CONDITIONS_PAGE_ID);

  if (!page) {
    return {
      title: 'Terms and Conditions',
      description: 'Terms and Conditions for Kosuke',
    };
  }

  return {
    title: page.meta_title || page.title || 'Terms and Conditions',
    description: page.meta_description || page.excerpt || 'Terms and Conditions for Kosuke',
    openGraph: {
      title: page.og_title || page.meta_title || page.title,
      description: page.og_description || page.meta_description || page.excerpt || undefined,
      type: 'website',
      ...(page.og_image && { images: [page.og_image] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.twitter_title || page.meta_title || page.title,
      description: page.twitter_description || page.meta_description || page.excerpt || undefined,
      ...(page.twitter_image && { images: [page.twitter_image] }),
    },
  };
}

export default async function TermsOfServicePage() {
  const page = await getPageById(TERMS_AND_CONDITIONS_PAGE_ID);

  if (!page) {
    notFound();
  }

  return <GhostPageContent page={page} />;
}
