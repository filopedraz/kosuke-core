'use client';

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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCompleteRequirements } from '@/hooks/use-complete-requirements';
import { useProject } from '@/hooks/use-projects';
import { useRequirementsDocs } from '@/hooks/use-requirements-docs';
import type { ProjectEstimate } from '@/lib/types/project';
import { cn } from '@/lib/utils';
import { renderSafeMarkdown } from '@/lib/utils/markdown';
import { CheckCircle, FileText, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EstimateModal from './estimate-modal';

interface RequirementsDocsPreviewProps {
  projectId: number;
  className?: string;
}

export default function RequirementsDocsPreview({
  projectId,
  className,
}: RequirementsDocsPreviewProps) {
  const { data: docsData } = useRequirementsDocs(projectId);
  const { data: project } = useProject(projectId);
  const completeRequirements = useCompleteRequirements(projectId);
  const [renderedContent, setRenderedContent] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimate, setEstimate] = useState<ProjectEstimate | null>(null);

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
    setShowConfirmDialog(false);
    completeRequirements.mutate(undefined, {
      onSuccess: (data) => {
        // Show estimate modal with the result
        if (data.estimate) {
          setEstimate(data.estimate);
          setShowEstimateModal(true);
        }
      },
    });
  };

  // Load estimate from project data if already completed
  useEffect(() => {
    if (
      project?.status === 'ready' &&
      project.estimateComplexity &&
      project.estimateAmount &&
      project.estimateReasoning
    ) {
      setEstimate({
        complexity: project.estimateComplexity as 'simple' | 'medium' | 'complex',
        amount: project.estimateAmount,
        timeline:
          project.estimateComplexity === 'simple'
            ? '1 week'
            : project.estimateComplexity === 'medium'
              ? '2 weeks'
              : '3 weeks',
        reasoning: project.estimateReasoning,
      });
    }
  }, [project]);

  // Waiting for docs.md to be created - no loading spinners during polling
  if (!docsData?.exists || !docsData?.content) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <FileText className="h-16 w-16 text-muted-foreground/40" />
            <div className="space-y-2">
              <h3 className="text-xl font-medium">Waiting for Requirements Document</h3>
              <p className="text-muted-foreground">
                Chat with the AI on the left to gather your project requirements.
                I'll create a comprehensive <code className="bg-muted px-1 rounded">docs.md</code> file
                once we've discussed all the details.
              </p>
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
          {project?.status === 'ready' && estimate ? (
            // Show "View Estimate" button if already completed
            <Button className="gap-2" onClick={() => setShowEstimateModal(true)}>
              <Sparkles className="h-4 w-4" />
              View Estimate
            </Button>
          ) : (
            // Show "Complete Requirements" button with confirmation
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button className="gap-2" disabled={completeRequirements.isPending}>
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
                    This will analyze your requirements and generate a project estimate. After
                    reviewing the estimate, your project will be marked as ready.
                    <br />
                    <br />
                    You'll need to manually activate the project to access development features.
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
          )}
        </div>
      </div>

      {/* Markdown Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full">
          <div className="p-6 max-w-4xl">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Estimate Modal */}
      {estimate && (
        <EstimateModal
          isOpen={showEstimateModal}
          onClose={() => setShowEstimateModal(false)}
          estimate={estimate}
        />
      )}
    </div>
  );
}

