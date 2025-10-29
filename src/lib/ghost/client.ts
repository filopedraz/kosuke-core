import GhostContentAPI from '@tryghost/content-api';

import type { BlogPost, Customer, GhostPage, GhostPost, GhostTag } from '@/lib/types/ghost';

// Lazy initialization of Ghost Content API client
let ghostClient: GhostContentAPI | null = null;

/**
 * Get or create the Ghost Content API client
 * This is lazily initialized to avoid errors during build time
 */
function getGhostClient(): GhostContentAPI {
  if (!ghostClient) {
    if (!process.env.NEXT_PUBLIC_GHOST_URL) {
      throw new Error('NEXT_PUBLIC_GHOST_URL environment variable is not set');
    }

    if (!process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY) {
      throw new Error('NEXT_PUBLIC_GHOST_CONTENT_API_KEY environment variable is not set');
    }

    ghostClient = new GhostContentAPI({
      url: process.env.NEXT_PUBLIC_GHOST_URL,
      key: process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY,
      version: 'v5.0',
    });
  }

  return ghostClient;
}

/**
 * Fetch all customers (Pages with 'customer' tag)
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    const client = getGhostClient();
    const pages = await client.pages.browse({
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
    const client = getGhostClient();
    const page = await client.pages.read(
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
    const client = getGhostClient();
    const { limit = 12, page = 1, tag } = params || {};

    const filter = tag ? `tag:${tag}` : undefined;

    const response = await client.posts.browse({
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
    const client = getGhostClient();
    const post = await client.posts.read(
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
    const client = getGhostClient();
    const tags = await client.tags.browse({
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
 * Fetch a page by ID
 */
export async function getPageById(id: string): Promise<GhostPage | null> {
  try {
    const client = getGhostClient();
    const page = await client.pages.read({ id });
    return page;
  } catch (error) {
    console.error(`Error fetching page ${id}:`, error);
    return null;
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
