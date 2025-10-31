/**
 * Ghost CMS Types
 * Types for interacting with Ghost Content API
 */

// Base Ghost Post/Page type
export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  feature_image: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string;
  excerpt: string | null;
  tags?: GhostTag[];
  primary_tag?: GhostTag | null;
  authors?: GhostAuthor[];
  primary_author?: GhostAuthor | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  custom_excerpt?: string | null;
  reading_time?: number;
}

// Ghost Page type (same as Post but semantically different)
export type GhostPage = GhostPost;

// Ghost Tag type
interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  feature_image: string | null;
  visibility: 'public' | 'internal';
  meta_title?: string | null;
  meta_description?: string | null;
}

// Ghost Author type
interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
  cover_image: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  facebook: string | null;
  twitter: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
}

// Customer type (Page with customer tag)
export interface Customer {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  html: string;
  featureImage: string | null;
  publishedAt: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

// Blog Post type
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  html: string;
  featureImage: string | null;
  publishedAt: string;
  readingTime?: number;
  tags: GhostTag[];
  primaryTag?: GhostTag | null;
  author?: GhostAuthor;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface NewsletterSubscriptionResponse {
  success: boolean;
  message: string;
  alreadySubscribed?: boolean;
}
