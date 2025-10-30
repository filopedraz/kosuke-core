import { format } from 'date-fns';
import { ArrowLeft, Clock } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Script from 'next/script';

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
        <article
          className="max-w-4xl mx-auto prose prose-lg dark:prose-invert
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
            prose-h1:text-4xl prose-h1:font-extrabold prose-h1:mb-6 prose-h1:mt-12 prose-h1:leading-tight
            prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-6 prose-h2:mt-12 prose-h2:leading-tight
            prose-h3:text-2xl prose-h3:font-bold prose-h3:mb-4 prose-h3:mt-10 prose-h3:leading-snug
            prose-h4:text-xl prose-h4:font-semibold prose-h4:mb-3 prose-h4:mt-8
            prose-p:text-base prose-p:leading-relaxed prose-p:mb-6 prose-p:text-muted-foreground
            prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
            prose-strong:font-semibold prose-strong:text-foreground
            prose-ul:my-8 prose-ul:list-disc prose-ul:pl-8 prose-ul:space-y-3
            prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-8 prose-ol:space-y-3
            prose-li:leading-relaxed prose-li:my-2
            prose-img:rounded-lg prose-img:shadow-md prose-img:my-8
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-muted-foreground
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-foreground
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border
            [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:mb-6 [&_h1]:mt-12 [&_h1]:text-foreground
            [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-6 [&_h2]:mt-12 [&_h2]:text-foreground
            [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-10 [&_h3]:text-foreground
            [&_h4]:text-xl [&_h4]:font-semibold [&_h4]:mb-3 [&_h4]:mt-8 [&_h4]:text-foreground
            [&_p]:mb-6
            [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-8 [&_ul]:space-y-3
            [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-8 [&_ol]:space-y-3
            [&_li]:leading-relaxed [&_li]:my-2
            [&_ul>li]:list-disc [&_ul>li]:ml-0
            [&_ol>li]:list-decimal [&_ol>li]:ml-0"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </section>
    </div>
  );
}
