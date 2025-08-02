import { Skeleton } from '@/components/ui/skeleton';

export function HomeLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>
  );
}
