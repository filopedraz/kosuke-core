import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-background">
      <div className="text-center space-y-6">
        <div className="text-4xl mb-4">🤔</div>
        <h1 className="text-4xl text-foreground tracking-tight">Page not found</h1>
        <p className="text-base text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div>
          <Button variant="outline" size="default" asChild>
            <Link href="/" className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
