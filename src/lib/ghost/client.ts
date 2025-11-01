import GhostContentAPI from '@tryghost/content-api';

import type { BlogPost, Customer, GhostPage, GhostPost } from '@/lib/types/ghost';

// Lazy initialization of Ghost Content API client
let ghostClient: InstanceType<typeof GhostContentAPI> | null = null;

/**
 * Get or create the Ghost Content API client
 * This is lazily initialized to avoid errors during build time
 * Returns null if credentials are missing (allows build to succeed)
 */
function getGhostClient(): InstanceType<typeof GhostContentAPI> | null {
  // Return null if credentials are missing (e.g., during CI build)
  if (!process.env.NEXT_PUBLIC_GHOST_URL || !process.env.NEXT_PUBLIC_GHOST_CONTENT_API_KEY) {
    return null;
  }

  if (!ghostClient) {
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
 * Only fetches published pages
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    const client = getGhostClient();
    if (!client) return [];

    const pages = (await client.pages.browse({
      filter: 'tag:customer+status:published',
      include: ['tags'],
      limit: 'all',
    })) as GhostPage[];

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
    if (!client) return null;

    const page = (await client.pages.read(
      { slug },
      {
        include: ['tags'],
      }
    )) as GhostPage;

    return pageToCustomer(page);
  } catch (error) {
    console.error(`Error fetching customer ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all blog posts
 * Only fetches published posts
 */
export async function getBlogPosts(params?: {
  limit?: number;
  page?: number;
  tag?: string;
}): Promise<{ posts: BlogPost[]; pagination: { page: number; pages: number; total: number } }> {
  try {
    const client = getGhostClient();
    if (!client) return { posts: [], pagination: { page: 1, pages: 0, total: 0 } };

    const { limit = 12, page = 1, tag } = params || {};

    // Build filter to only include published posts
    const filters = ['status:published'];
    if (tag) {
      filters.push(`tag:${tag}`);
    }
    const filter = filters.join('+');

    const response = await client.posts.browse({
      limit,
      page,
      filter,
      include: ['tags', 'authors'],
    });

    return {
      posts: (response as GhostPost[]).map(postToBlogPost),
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
    if (!client) return null;

    const post = (await client.posts.read(
      { slug },
      {
        include: ['tags', 'authors'],
      }
    )) as GhostPost;

    return postToBlogPost(post);
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch a page by ID
 */
export async function getPageById(id: string): Promise<GhostPage | null> {
  try {
    const client = getGhostClient();
    if (!client) return null;

    const page = (await client.pages.read({ id })) as GhostPage;
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
