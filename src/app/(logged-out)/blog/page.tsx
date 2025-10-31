import { Metadata } from 'next';

import { getBlogPosts } from '@/lib/ghost/client';

import { BlogGrid } from './components/blog-grid';
import { BlogHero } from './components/blog-hero';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export const metadata: Metadata = {
  title: 'Blog | Kosuke',
  description:
    'Insights, updates, and best practices for building better products with AI-powered development.',
  alternates: {
    canonical: `${baseUrl}/blog`,
  },
};

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BlogPage({ searchParams }: Props) {
  const { page = '1' } = await searchParams;
  const currentPage = parseInt(page, 10);

  const { posts, pagination } = await getBlogPosts({ page: currentPage });

  return (
    <div className="w-full min-h-screen bg-background">
      <BlogHero />

      {/* Blog Posts Grid */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-screen-2xl mx-auto">
        <BlogGrid posts={posts} pagination={pagination} />
      </section>
    </div>
  );
}
