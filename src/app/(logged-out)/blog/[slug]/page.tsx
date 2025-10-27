import { format } from 'date-fns';
import { ArrowLeft, Clock } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

  return {
    title: `${post.metaTitle || post.title} | Kosuke Blog`,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: post.featureImage
      ? {
          images: [post.featureImage],
        }
      : undefined,
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

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-8 max-w-screen-2xl mx-auto border-border">
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </section>

      {/* Hero Section */}
      <section className="w-full px-6 sm:px-8 md:px-16 lg:px-24 py-12 md:py-16 max-w-screen-2xl mx-auto">
        <div className="max-w-4xl mx-auto">
          {post.primaryTag && (
            <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-4">
              {post.primaryTag.name}
            </span>
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
          className="max-w-4xl mx-auto prose prose-lg dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
