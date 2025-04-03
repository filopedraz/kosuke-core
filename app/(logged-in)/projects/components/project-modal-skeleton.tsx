import { Skeleton } from "@/components/ui/skeleton";

export function ProjectModalSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-7 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
} 