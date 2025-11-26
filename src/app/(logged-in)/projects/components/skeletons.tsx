import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectCardSkeleton() {
  return (
    <div className="block group">
      <Card className="overflow-hidden h-full transition-all duration-300 border border-border relative bg-card pb-0 min-h-[140px]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Skeleton className="h-[26px] w-48" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-3 w-24" />
        </CardContent>
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-muted/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>
    </div>
  );
}

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
