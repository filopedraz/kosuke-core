import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function ProjectCardSkeleton() {
  return (
    <div className="block group">
      <Card className="overflow-hidden h-full transition-all duration-300 border border-border relative bg-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[40px] space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </Card>
    </div>
  );
} 