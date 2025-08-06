'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2 } from 'lucide-react';
import { useDatabaseQuery } from '@/hooks/use-database-query';
import { QueryRunnerSkeleton } from './skeletons/query-runner-skeleton';
import type { QueryRunnerProps, QueryResult } from '@/lib/types';

export function QueryRunner({ projectId }: QueryRunnerProps) {
  const [query, setQuery] = useState('SELECT * FROM sqlite_master WHERE type=\'table\';');
  const [result, setResult] = useState<QueryResult | null>(null);
  
  const { mutate: executeQuery, isPending } = useDatabaseQuery(projectId);

  const handleExecuteQuery = () => {
    if (!query.trim()) return;
    
    executeQuery(query, {
      onSuccess: (data) => {
        setResult(data);
      },
      onError: () => {
        setResult(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Query input */}
      <Card>
        <CardHeader>
          <CardTitle>SQL Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here (SELECT statements only)..."
            className="min-h-32 font-mono"
          />
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Only SELECT queries are allowed for security reasons
            </div>
            <Button 
              onClick={handleExecuteQuery}
              disabled={isPending || !query.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Query
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Query results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Query Results</CardTitle>
              <Badge variant="secondary">
                {result.rows} row{result.rows !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {result.data.length > 0 ? (
              <>
                {/* Results table */}
                <div className="rounded-md border overflow-auto max-h-96">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {result.columns.map(column => (
                          <th key={column} className="p-2 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((row, index) => (
                        <tr key={index} className="border-b">
                          {result.columns.map(column => (
                            <td key={column} className="p-2 font-mono text-sm">
                              {row[column] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : (
                                String(row[column])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Query info */}
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Query executed successfully</span>
                  <span>{result.rows} row{result.rows !== 1 ? 's' : ''} returned</span>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Query executed successfully but returned no results
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}