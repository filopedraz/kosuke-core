import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TableBrowserSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table selector skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* Table data skeleton */}
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
          {/* Table header skeleton */}
          <div className="rounded-md border">
            <div className="border-b bg-muted/50 p-4">
              <div className="flex gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-20" />
                ))}
              </div>
            </div>
            
            {/* Table rows skeleton */}
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <div key={rowIndex} className="border-b p-4">
                <div className="flex gap-4">
                  {Array.from({ length: 5 }).map((_, colIndex) => (
                    <Skeleton key={colIndex} className="h-4 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between mt-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}