import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ConnectionStatusProps } from '@/lib/types';

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <Badge
      variant={connected ? 'default' : 'destructive'}
      className="flex items-center gap-1 text-xs"
    >
      {connected ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {connected ? 'Connected' : 'Disconnected'}
    </Badge>
  );
}