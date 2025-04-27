'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ColorCardSkeleton() {
  return (
    <Card className="overflow-hidden group">
      {/* Color preview area skeleton - matches h-32 from ColorCard */}
      <Skeleton className="h-32 w-full rounded-none" />
      
      <CardContent className="py-4 px-3">
        <div className="flex items-center justify-between">
          {/* Color name skeleton */}
          <Skeleton className="h-4 w-1/2" />
          
          {/* Hex value badge skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
} 