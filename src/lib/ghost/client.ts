import GhostContentAPI from '@tryghost/content-api';

import type { BlogPost, Customer, GhostPage, GhostPost, GhostTag } from '@/lib/types/ghost';

// Initialize Ghost Content API
if (!process.env.NEXT_PUBLIC_GHOST_URL) {
  throw new Error('NEXT_PUBLIC_GHOST_URL environment variable is not set');
}

if (!process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY) {
  throw new Error('NEXT_PUBLIC_GHOST_CONTENT_API_KEY environment variable is not set');
}

export const ghostClient = new GhostContentAPI({
  url: process.env.NEXT_PUBLIC_GHOST_URL,
  key: process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY,
  version: 'v5.0',
});

/**
 * Fetch all customers (Pages with 'customer' tag)
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    const pages = await ghostClient.pages.browse({
      filter: 'tag:customer',
      include: ['tags'],
      limit: 'all',
    });

    return pages.map(pageToCustomer);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

/**
 * Fetch a single customer by slug
 */
export async function getCustomerBySlug(slug: string): Promise<Customer | null> {
  try {
    const page = await ghostClient.pages.read(
      { slug },
      {
        include: ['tags'],
      }
    );

    return pageToCustomer(page);
  } catch (error) {
    console.error(`Error fetching customer ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all blog posts
 */
export async function getBlogPosts(params?: {
  limit?: number;
  page?: number;
  tag?: string;
}): Promise<{ posts: BlogPost[]; pagination: { page: number; pages: number; total: number } }> {
  try {
    const { limit = 12, page = 1, tag } = params || {};

    const filter = tag ? `tag:${tag}` : undefined;

    const response = await ghostClient.posts.browse({
      limit,
      page,
      filter,
      include: ['tags', 'authors'],
    });

    return {
      posts: response.map(postToBlogPost),
      pagination: {
        page: response.meta.pagination.page,
        pages: response.meta.pagination.pages,
        total: response.meta.pagination.total,
      },
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { posts: [], pagination: { page: 1, pages: 0, total: 0 } };
  }
}

/**
 * Fetch a single blog post by slug
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const post = await ghostClient.posts.read(
      { slug },
      {
        include: ['tags', 'authors'],
      }
    );

    return postToBlogPost(post);
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all tags used in blog posts
 */
export async function getBlogTags(): Promise<GhostTag[]> {
  try {
    const tags = await ghostClient.tags.browse({
      limit: 'all',
      filter: 'visibility:public',
    });

    return tags;
  } catch (error) {
    console.error('Error fetching blog tags:', error);
    return [];
  }
}

/**
 * Convert Ghost Page to Customer type
 */
function pageToCustomer(page: GhostPage): Customer {
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    excerpt: page.excerpt || page.custom_excerpt || null,
    html: page.html,
    featureImage: page.feature_image,
    publishedAt: page.published_at,
    metaTitle: page.meta_title,
    metaDescription: page.meta_description,
  };
}

/**
 * Convert Ghost Post to BlogPost type
 */
function postToBlogPost(post: GhostPost): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || post.custom_excerpt || null,
    html: post.html,
    featureImage: post.feature_image,
    publishedAt: post.published_at,
    readingTime: post.reading_time,
    tags: post.tags || [],
    primaryTag: post.primary_tag || null,
    author: post.primary_author || undefined,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
  };
}
