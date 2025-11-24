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
import type { CliLog, ConversationMessage } from '@/lib/types/cli-logs';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Log Details #{log.id}</SheetTitle>
          <SheetDescription>
            {format(new Date(log.startedAt), 'MMM dd, yyyy, h:mm:ss a')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Command</p>
              <p className="text-foreground">{log.command}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
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
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Tokens Used
              </p>
              <p className="text-foreground">{totalTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Response Time
              </p>
              <p className="text-foreground">{log.executionTimeMs}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Cost</p>
              <p className="text-foreground">${parseFloat(log.cost).toFixed(4)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                Timestamp
              </p>
              <p className="text-foreground">
                {format(new Date(log.startedAt), 'MMM dd, yyyy, h:mm:ss a')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Files Modified */}
          {log.filesModified && Array.isArray(log.filesModified) && log.filesModified.length > 0 ? (
            <div>
              <h3 className="font-semibold text-base mb-2">
                Files Modified ({log.filesModified.length})
              </h3>
              <div className="bg-muted/50 p-4 rounded-md text-sm">
                {log.filesModified.map((file, i) => (
                  <div key={i} className="text-foreground">
                    {file as string}
                  </div>
                ))}
              </div>
              <Separator className="mt-6" />
            </div>
          ) : null}

          {/* Conversation Messages */}
          {log.conversationMessages &&
          Array.isArray(log.conversationMessages) &&
          log.conversationMessages.length > 0 ? (
            <>
              {(log.conversationMessages as ConversationMessage[]).map((msg, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-base capitalize">{msg.role} Prompt</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(msg.content || '', `msg-${i}`)}
                    >
                      {copiedField === `msg-${i}` ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-md text-sm text-foreground whitespace-pre-wrap">
                    {msg.content || '(No content)'}
                  </div>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        Tool Calls ({msg.toolCalls.length})
                      </summary>
                      <div className="mt-2 space-y-2 pl-4">
                        {msg.toolCalls.map((tool, ti: number) => (
                          <div key={ti} className="text-xs">
                            <div className="font-semibold text-foreground mb-1">{tool.name}</div>
                            <details>
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Input
                              </summary>
                              <pre className="mt-1 p-2 rounded bg-muted text-foreground overflow-x-auto text-xs">
                                {JSON.stringify(tool.input, null, 2)}
                              </pre>
                            </details>
                            {tool.output && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  Output
                                </summary>
                                <pre className="mt-1 p-2 rounded bg-muted text-foreground overflow-x-auto max-h-32 text-xs">
                                  {typeof tool.output === 'string'
                                    ? tool.output
                                    : JSON.stringify(tool.output, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  <Separator className="mt-6" />
                </div>
              ))}
            </>
          ) : null}

          {/* Error Message */}
          {log.errorMessage ? (
            <div>
              <h3 className="font-semibold text-base mb-2 text-destructive">Error Message</h3>
              <div className="bg-destructive/10 p-4 rounded-md text-sm whitespace-pre-wrap text-destructive">
                {log.errorMessage}
              </div>
              <Separator className="mt-6" />
            </div>
          ) : null}

          {/* Additional Details */}
          {(log.commandArgs !== null ||
            log.cliVersion ||
            log.fixesApplied !== null ||
            log.testsRun !== null ||
            log.iterations !== null) && (
            <div>
              <h3 className="font-semibold text-base mb-3">Additional Details</h3>
              <div className="space-y-3 text-sm">
                {log.cliVersion && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                      CLI Version
                    </p>
                    <p className="text-foreground">{log.cliVersion}</p>
                  </div>
                )}
                {log.fixesApplied !== null && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                      Fixes Applied
                    </p>
                    <p className="text-foreground">{log.fixesApplied}</p>
                  </div>
                )}
                {log.testsRun !== null && (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                        Tests Run
                      </p>
                      <p className="text-foreground">{log.testsRun}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                        Tests Passed
                      </p>
                      <p className="text-chart-2">{log.testsPassed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                        Tests Failed
                      </p>
                      <p className="text-destructive">{log.testsFailed}</p>
                    </div>
                  </>
                )}
                {log.iterations !== null && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                      Iterations
                    </p>
                    <p className="text-foreground">{log.iterations}</p>
                  </div>
                )}
                {log.commandArgs !== null && log.commandArgs !== undefined && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                      Command Arguments
                    </p>
                    <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto text-foreground">
                      {JSON.stringify(log.commandArgs, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
