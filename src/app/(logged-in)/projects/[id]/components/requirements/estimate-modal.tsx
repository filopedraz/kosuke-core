'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ProjectComplexity, ProjectEstimate } from '@/lib/types/project';
import { CheckCircle2, Clock, DollarSign, Sparkles } from 'lucide-react';

interface EstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: ProjectEstimate;
}

const COMPLEXITY_INFO: Record<
  ProjectComplexity,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  simple: {
    label: 'Simple',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950',
    icon: '🟢',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    icon: '🟡',
  },
  complex: {
    label: 'Complex',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950',
    icon: '🔴',
  },
};

export default function EstimateModal({ isOpen, onClose, estimate }: EstimateModalProps) {
  const complexityInfo = COMPLEXITY_INFO[estimate.complexity];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Project Estimate
          </DialogTitle>
          <DialogDescription>
            AI-generated estimate based on your requirements document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Complexity Badge */}
          <div className="flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-3 px-6 py-3 rounded-full ${complexityInfo.bgColor}`}
            >
              <span className="text-2xl">{complexityInfo.icon}</span>
              <span className={`text-xl font-semibold ${complexityInfo.color}`}>
                {complexityInfo.label} Complexity
              </span>
            </div>
          </div>

          {/* Estimate Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Estimate</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                ${estimate.amount.toLocaleString()}
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Timeline</span>
              </div>
              <div className="text-3xl font-bold text-primary">{estimate.timeline}</div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Analysis</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{estimate.reasoning}</p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">Note:</span> This is an AI-generated estimate based on
              the requirements document. The actual project cost and timeline may vary based on
              specific implementation details and team composition.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

