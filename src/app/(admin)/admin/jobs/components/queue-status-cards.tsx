'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import type { QueueMetrics } from '@/lib/types/jobs';

interface QueueStatusCardsProps {
  queues: QueueMetrics[];
}

export function QueueStatusCards({ queues }: QueueStatusCardsProps) {
  if (queues.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        No queues found. Start the worker process to see queue status.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {queues.map(queue => (
        <Card key={queue.name}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium capitalize">
              {queue.name.replace(/-/g, ' ')} Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              {queue.paused ? (
                <Badge variant="secondary">Paused</Badge>
              ) : (
                <Activity className="h-4 w-4 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waiting:</span>
                  <span className="font-medium">{queue.waiting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {queue.active}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {queue.completed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{queue.failed}</span>
                </div>
                {queue.delayed > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Delayed:</span>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {queue.delayed}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
