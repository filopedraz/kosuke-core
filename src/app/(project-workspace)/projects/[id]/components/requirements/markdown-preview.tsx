'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { marked } from 'marked';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  }, [content]);

  // Show placeholder when no content
  if (!content) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center max-w-md px-6">
          <h3 className="text-lg font-semibold mb-2">No Requirements Yet</h3>
          <p className="text-sm text-muted-foreground">
            Your requirements document will appear here as we discuss your project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={className}>
      <Card className="p-6 m-6">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </Card>
    </ScrollArea>
  );
}

