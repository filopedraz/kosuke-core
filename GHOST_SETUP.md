# Ghost CMS Setup Guide

This document explains how to configure Ghost CMS integration for the Kosuke application.

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Ghost CMS Configuration
NEXT_PUBLIC_GHOST_URL=https://your-ghost-instance.ghost.io
NEXT_PUBLIC_GHOST_CONTENT_API_KEY=your_content_api_key_here
```

### How to Get Your Ghost Credentials

1. **Ghost URL**: This is your Ghost instance URL
   - If using Ghost Pro: `https://yoursite.ghost.io`
   - If self-hosted: `https://yourdomain.com`

2. **Content API Key**:
   - Log into your Ghost Admin panel
   - Go to **Settings** → **Integrations**
   - Click **Add custom integration**
   - Give it a name (e.g., "Kosuke Frontend")
   - Copy the **Content API Key**

## Content Structure

### Customers

Customers are stored as **Pages** in Ghost with the `customer` tag:

1. In Ghost Admin, create a new **Page** (not Post)
2. Add the tag `customer` to the page
3. The page will automatically appear in `/customers`

**Recommended fields:**

- **Title**: Company name
- **Feature Image**: Company logo or hero image
- **Excerpt**: Brief description (appears in card view)
- **Content**: Full case study with markdown formatting
- **Meta Title**: SEO title (optional)
- **Meta Description**: SEO description (optional)

### Blog Posts

Blog posts are regular **Posts** in Ghost:

1. Create posts as normal in Ghost Admin
2. Add relevant tags for filtering
3. Posts automatically appear in `/blog`

**Recommended fields:**

- **Title**: Post title
- **Feature Image**: Blog post hero image
- **Excerpt**: Brief summary (appears in card view)
- **Content**: Full article with markdown formatting
- **Tags**: Categories for filtering
- **Author**: Post author information
- **Meta Title**: SEO title (optional)
- **Meta Description**: SEO description (optional)

## Features Implemented

### Pages

1. **Customers**
   - List view: `/customers`
   - Detail view: `/customers/[slug]`
   - Fetched from Ghost Pages API with `customer` tag

2. **Blog**
   - List view: `/blog`
   - Detail view: `/blog/[slug]`
   - Tag filtering functionality
   - Pagination support

3. **Solutions**
   - `/solutions/ship-with-engineers`
   - `/solutions/enabling-collaboration`
   - `/solutions/on-premise`
   - `/solutions/venture-builder`
   - Static pages with reusable layout component

### Navigation

The navbar includes:

- **Customers**: Link to customers list
- **Solutions**: Dropdown menu with 4 solution pages
- **Blog**: Link to blog
- **Contact Us**: Link to Calendly (https://calendly.com/filippo-pedrazzini-kosuke/30min)
- **Get Started**: Opens survey modal (existing PrivateAlphaModal)

**Responsive Design:**

- Desktop: Horizontal navigation menu
- Mobile: Hamburger menu with slide-out drawer

### SEO & Performance

- Dynamic metadata generation for all pages
- Next.js Image optimization for Ghost images
- Static generation for better SEO
- Proper meta tags from Ghost content

## Image Optimization

Ghost images are automatically optimized through Next.js Image component. Supported domains:

- `*.ghost.io` (Ghost Pro)
- `images.unsplash.com` (Ghost uses Unsplash)
- `static.ghost.org` (Ghost static assets)

If using a custom domain, add it to `next.config.ts`:

```typescript
{
  protocol: 'https',
  hostname: 'yourdomain.com',
}
```

## Testing

To test the Ghost integration:

1. Set up your Ghost instance with test content
2. Add environment variables
3. Run `npm run dev`
4. Visit:
   - http://localhost:3000/customers
   - http://localhost:3000/blog
   - http://localhost:3000/solutions/ship-with-engineers

## Troubleshooting

### "Environment variable is not set" Error

Make sure both environment variables are set in `.env.local`:

- `NEXT_PUBLIC_GHOST_URL`
- `NEXT_PUBLIC_GHOST_CONTENT_API_KEY`

### Images Not Loading

1. Check that images are uploaded to Ghost
2. Verify the image domain is in `next.config.ts` `remotePatterns`
3. Check browser console for CORS or image optimization errors

### No Content Appearing

1. Verify Ghost Content API is enabled
2. Check that API key has correct permissions
3. For customers: ensure pages have the `customer` tag
4. For blog: ensure posts are published (not drafts)

## API Usage

The Ghost client is located in `src/lib/ghost/client.ts` and provides:

- `getCustomers()` - Fetch all customers
- `getCustomerBySlug(slug)` - Fetch single customer
- `getBlogPosts(params)` - Fetch blog posts with pagination/filtering
- `getBlogPostBySlug(slug)` - Fetch single blog post
- `getBlogTags()` - Fetch all blog tags

All functions include error handling and return empty arrays/null on failure.
