'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { marked } from 'marked';
import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return marked.parse(content, { async: false }) as string;
  }, [content]);

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

