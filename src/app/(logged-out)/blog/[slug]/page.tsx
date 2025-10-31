import { format } from 'date-fns';
import { ArrowLeft, Clock } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import { GhostHtmlContent } from '@/components/ghost-html-content';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/ghost/client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | Kosuke Blog',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';
  const images = post.featureImage ? [post.featureImage] : undefined;

  return {
    title: `${post.metaTitle || post.title} | Kosuke Blog`,
    description: post.metaDescription || post.excerpt || undefined,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title: `${post.metaTitle || post.title}`,
      description: post.metaDescription || post.excerpt || undefined,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author.name] : undefined,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.metaTitle || post.title}`,
      description: post.metaDescription || post.excerpt || undefined,
      images,
    },
  };
}

export async function generateStaticParams() {
  const { posts } = await getBlogPosts({ limit: 50 });

  return posts.map(post => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kosuke.ai';

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.metaDescription || undefined,
    image: post.featureImage || undefined,
    datePublished: post.publishedAt,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author.name,
          url: post.author.website || undefined,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Kosuke',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${slug}`,
    },
    keywords: post.tags.map(tag => tag.name).join(', '),
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <Script
        id="blog-post-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
      />
      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pt-8 pb-12 md:pb-16 max-w-screen-2xl mx-auto">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/blog" className="block mb-6">
            <Button variant="ghost" size="sm" className="gap-2 -ml-3">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
          {post.primaryTag && (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
                {post.primaryTag.name}
              </span>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {post.title}
          </h1>

          {/* Author & Meta */}
          <div className="flex items-center gap-4 mb-8">
            {post.author && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={post.author.profile_image || undefined}
                    alt={post.author.name}
                  />
                  <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">{post.author.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <time dateTime={post.publishedAt}>
                      {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                    </time>
                    {post.readingTime && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{post.readingTime} min read</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {post.featureImage && (
            <div className="relative w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden">
              <Image
                src={post.featureImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-screen-2xl mx-auto">
        <GhostHtmlContent html={post.html} className="max-w-4xl mx-auto" />
      </section>
    </div>
  );
}
