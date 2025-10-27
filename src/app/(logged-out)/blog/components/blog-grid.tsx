'use client';

import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/lib/types/ghost';

type BlogGridProps = {
  posts: BlogPost[];
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
  currentTag?: string;
};

export function BlogGrid({ posts, pagination, currentTag }: BlogGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    if (currentTag) {
      params.set('tag', currentTag);
    }
    router.push(`/blog?${params.toString()}`);
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No blog posts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-lg"
          >
            {post.featureImage && (
              <div className="relative w-full h-48 bg-muted overflow-hidden">
                <Image
                  src={post.featureImage}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            )}
            <div className="p-6">
              {post.primaryTag && (
                <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-3">
                  {post.primaryTag.name}
                </span>
              )}
              <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4">{post.excerpt}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <time dateTime={post.publishedAt}>
                  {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                </time>
                {post.readingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{post.readingTime} min read</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={page === pagination.page ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
