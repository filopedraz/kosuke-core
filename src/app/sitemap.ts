import { MetadataRoute } from 'next';

import { getBlogPosts, getCustomers } from '@/lib/ghost/client';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  // Note: lastModified omitted for static pages
  // Update lastModified manually when making significant content changes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/home`,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/customers`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/solutions/startup-program`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/solutions/ship-with-engineers`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/solutions/enabling-collaboration`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/solutions/on-premise`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    let allPosts: Array<{ slug: string; publishedAt: string }> = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const { posts, pagination } = await getBlogPosts({ limit: 100, page: currentPage });
      allPosts = [...allPosts, ...posts];
      hasMorePages = currentPage < pagination.pages;
      currentPage++;
    }

    blogRoutes = allPosts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error generating blog routes for sitemap:', error);
  }

  let customerRoutes: MetadataRoute.Sitemap = [];
  try {
    const customers = await getCustomers();
    customerRoutes = customers.map(customer => ({
      url: `${baseUrl}/customers/${customer.slug}`,
      lastModified: new Date(customer.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error generating customer routes for sitemap:', error);
  }

  return [...staticRoutes, ...blogRoutes, ...customerRoutes];
}
