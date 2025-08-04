'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import type { PipelinePreference } from '@/lib/types';
import { Bot, Zap, AlertTriangle } from 'lucide-react';

function PipelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelinePage() {
  const { user, isLoading, updatePipelinePreference } = useUser();
  const { toast } = useToast();

  const handlePipelineChange = async (value: PipelinePreference) => {
    try {
      await updatePipelinePreference(value);

      // Show deprecation warning for Kosuke
      if (value === 'kosuke') {
        toast({
          title: 'Deprecated Agent Selected',
          description:
            'Kosuke agent is deprecated and will be removed in a future update. Consider switching to Claude Code for the latest features.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating pipeline preference:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PipelineSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Pipeline Configuration
          </CardTitle>
          <CardDescription>
            Choose which AI agent to use for your projects. Each agent has different capabilities
            and specializations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="pipeline-select" className="text-base font-medium">
              Default Agent
            </Label>
            <Select
              value={user?.pipelinePreference || 'claude-code'}
              onValueChange={handlePipelineChange}
            >
              <SelectTrigger id="pipeline-select" className="w-full">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-code">
                  <div className="flex items-center gap-3">
                    <Bot className="h-4 w-4" />
                    <span>Claude Code</span>
                  </div>
                </SelectItem>
                <SelectItem value="kosuke">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Kosuke (deprecated)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
