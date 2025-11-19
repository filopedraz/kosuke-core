'use client';

import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CliLog } from '@/lib/types/cli-logs';

interface LogDetailSheetProps {
  log: CliLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogDetailSheet({ log, open, onOpenChange }: LogDetailSheetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!log) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const totalTokens = log.tokensInput + log.tokensOutput;
  const cacheableTokens = (log.tokensCacheCreation ?? 0) + (log.tokensCacheRead ?? 0);
  const cacheHitRate =
    cacheableTokens > 0 ? (((log.tokensCacheRead ?? 0) / cacheableTokens) * 100).toFixed(1) : '0';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline">{log.command}</Badge>
            <Badge
              variant={
                log.status === 'success'
                  ? 'default'
                  : log.status === 'error'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {log.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>Executed {format(new Date(log.startedAt), 'PPpp')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Cost & Tokens */}
          <div>
            <h3 className="font-semibold mb-3">Cost & Token Usage</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Cost</p>
                <p className="font-mono font-semibold">${parseFloat(log.cost).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Tokens</p>
                <p className="font-mono font-semibold">{totalTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Input Tokens</p>
                <p className="font-mono">{log.tokensInput.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Output Tokens</p>
                <p className="font-mono">{log.tokensOutput.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cache Creation</p>
                <p className="font-mono">{(log.tokensCacheCreation ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cache Read</p>
                <p className="font-mono">{(log.tokensCacheRead ?? 0).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Cache Hit Rate</p>
                <p className="font-mono font-semibold">{cacheHitRate}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Performance */}
          <div>
            <h3 className="font-semibold mb-3">Performance</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Duration</p>
                <p className="font-mono">{(log.executionTimeMs / 1000).toFixed(2)}s</p>
              </div>
              {log.inferenceTimeMs !== null && log.inferenceTimeMs !== undefined ? (
                <div>
                  <p className="text-muted-foreground">Inference Time</p>
                  <p className="font-mono">{(log.inferenceTimeMs / 1000).toFixed(2)}s</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Command Results */}
          {log.fixesApplied !== null || log.testsRun !== null || log.iterations !== null ? (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Command Results</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {log.fixesApplied !== null ? (
                    <div>
                      <p className="text-muted-foreground">Fixes Applied</p>
                      <p className="font-mono">{log.fixesApplied}</p>
                    </div>
                  ) : null}
                  {log.testsRun !== null ? (
                    <>
                      <div>
                        <p className="text-muted-foreground">Tests Run</p>
                        <p className="font-mono">{log.testsRun}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tests Passed</p>
                        <p className="font-mono text-green-600">{log.testsPassed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tests Failed</p>
                        <p className="font-mono text-red-600">{log.testsFailed}</p>
                      </div>
                    </>
                  ) : null}
                  {log.iterations !== null ? (
                    <div>
                      <p className="text-muted-foreground">Iterations</p>
                      <p className="font-mono">{log.iterations}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {/* Files Modified */}
          {log.filesModified && Array.isArray(log.filesModified) && log.filesModified.length > 0 ? (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Files Modified ({log.filesModified.length})</h3>
                <div className="space-y-2">
                  {log.filesModified.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-muted text-sm font-mono"
                    >
                      <span className="truncate">{file as string}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(file as string, `file-${i}`)}
                      >
                        {copiedField === `file-${i}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Error Message */}
          {log.errorMessage ? (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-destructive">Error Message</h3>
                <div className="p-3 rounded bg-destructive/10 text-sm font-mono whitespace-pre-wrap">
                  {log.errorMessage}
                </div>
              </div>
            </>
          ) : null}

          {/* Metadata */}
          {log.commandArgs ? (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Command Arguments</h3>
                <pre className="p-3 rounded bg-muted text-xs overflow-x-auto">
                  {JSON.stringify(log.commandArgs, null, 2)}
                </pre>
              </div>
            </>
          ) : null}

          {/* CLI Version */}
          {log.cliVersion ? (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">CLI Version</h3>
                <p className="text-sm font-mono">{log.cliVersion}</p>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
