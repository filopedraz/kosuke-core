import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table } from 'lucide-react';

export function SchemaViewerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table cards skeleton */}
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Table className="w-4 h-4" />
                <Skeleton className="h-5 w-24" />
              </CardTitle>
              <Skeleton className="h-5 w-12" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Column rows skeleton */}
              {Array.from({ length: 4 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="flex items-center justify-between p-2 rounded border border-gray-800 bg-gray-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Skeleton className="w-3 h-3" />
                      <Skeleton className="w-3 h-3" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
