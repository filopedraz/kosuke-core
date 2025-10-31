'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { GhostTag } from '@/lib/types/ghost';
import { cn } from '@/lib/utils';

type TagFilterProps = {
  tags: GhostTag[];
  selectedTag?: string;
};

export function TagFilter({ tags, selectedTag }: TagFilterProps) {
  const pathname = usePathname();

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={pathname}>
        <Button variant={!selectedTag ? 'default' : 'outline'} size="sm">
          All Posts
        </Button>
      </Link>
      {tags.map(tag => (
        <Link key={tag.id} href={`${pathname}?tag=${tag.slug}`}>
          <Button
            variant={selectedTag === tag.slug ? 'default' : 'outline'}
            size="sm"
            className={cn(selectedTag === tag.slug && 'bg-primary text-primary-foreground')}
          >
            {tag.name}
          </Button>
        </Link>
      ))}
    </div>
  );
}
