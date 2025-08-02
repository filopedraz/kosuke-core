import { Skeleton } from '@/components/ui/skeleton';

export function AuthLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full mx-auto animate-pulse" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}
