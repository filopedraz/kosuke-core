import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GhostPageContent } from '@/components/ghost-page-content';
import { getPageById } from '@/lib/ghost/client';

const COOKIES_POLICY_PAGE_ID = '69032cc2e29d330001edc8ff';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageById(COOKIES_POLICY_PAGE_ID);

  if (!page) {
    return {
      title: 'Cookies Policy',
      description: 'Cookies Policy for Kosuke',
    };
  }

  return {
    title: page.meta_title || page.title || 'Cookies Policy',
    description: page.meta_description || page.excerpt || 'Cookies Policy for Kosuke',
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

export default async function CookiesPolicyPage() {
  const page = await getPageById(COOKIES_POLICY_PAGE_ID);

  if (!page) {
    notFound();
  }

  return <GhostPageContent page={page} />;
}
