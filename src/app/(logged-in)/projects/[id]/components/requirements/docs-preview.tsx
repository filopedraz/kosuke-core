'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompleteRequirements } from '@/hooks/use-complete-requirements';
import { useRequirementsDocs } from '@/hooks/use-requirements-docs';
import { cn } from '@/lib/utils';
import { renderSafeMarkdown } from '@/lib/utils/markdown';
import { CheckCircle, FileText, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RequirementsDocsPreviewProps {
  projectId: number;
  className?: string;
}

export default function RequirementsDocsPreview({
  projectId,
  className,
}: RequirementsDocsPreviewProps) {
  const { data: docsData, isLoading } = useRequirementsDocs(projectId);
  const completeRequirements = useCompleteRequirements(projectId);
  const [renderedContent, setRenderedContent] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Render markdown when content changes
  useEffect(() => {
    if (docsData?.content) {
      renderSafeMarkdown(docsData.content)
        .then(setRenderedContent)
        .catch((error) => {
          console.error('Error rendering markdown:', error);
          setRenderedContent(docsData.content.replace(/\n/g, '<br>'));
        });
    }
  }, [docsData?.content]);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (scrollRef.current && renderedContent) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [renderedContent]);

  const handleComplete = () => {
    completeRequirements.mutate();
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full p-6 space-y-6', className)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Requirements Document</h1>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-6 w-1/2 mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  // Waiting for docs.md to be created
  if (!docsData?.exists || !docsData?.content) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <div className="relative">
              <FileText className="h-16 w-16 text-muted-foreground/40" />
              <div className="absolute -top-1 -right-1">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Waiting for Requirements Document</h3>
              <p className="text-muted-foreground">
                Chat with the AI on the left to gather your project requirements.
                I'll create a comprehensive <code className="bg-muted px-1 rounded">docs.md</code> file 
                once we've discussed all the details.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
              <span>Checking for updates...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show docs.md content
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Requirements Document</h1>
          </div>
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogTrigger asChild>
              <Button
                className="gap-2"
                disabled={completeRequirements.isPending}
              >
                {completeRequirements.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Requirements
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete Requirements Gathering?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark your requirements as complete and activate all project features 
                  (Preview, Code Explorer, Branding, Database, Settings).
                  <br /><br />
                  You can continue refining your project through regular chat sessions after this.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>
                  Complete Requirements
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Markdown Content */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="p-6 max-w-4xl">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

