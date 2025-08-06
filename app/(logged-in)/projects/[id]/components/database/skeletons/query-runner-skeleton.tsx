import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function QueryRunnerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Query input skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Query results skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Skeleton className="h-5 w-24" />
            </CardTitle>
            <Skeleton className="h-5 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Results table skeleton */}
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-24" />
                ))}
              </div>
            </div>

            {/* Result rows skeleton */}
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div key={rowIndex} className="border-b p-4">
                <div className="flex gap-4">
                  {Array.from({ length: 4 }).map((_, colIndex) => (
                    <Skeleton key={colIndex} className="h-4 w-24" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Query info skeleton */}
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
