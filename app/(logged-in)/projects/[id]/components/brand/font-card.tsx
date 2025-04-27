'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type FontInfo } from '@/lib/font-parser';

interface FontCardProps {
  font: FontInfo;
}

export default function FontCard({ font }: FontCardProps) {
  // Format provider name for display
  const providerDisplay = font.provider.includes('google') 
    ? 'Google Fonts'
    : font.provider.includes('local') 
      ? 'Local Font' 
      : font.provider;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{font.name.replace('_', ' ')}</h3>
            <p className="text-sm text-muted-foreground">{providerDisplay}</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {font.variable}
          </Badge>
        </div>
        
        {/* Font preview with actual variable */}
        <div 
          className="border rounded-md p-3 mb-4"
          style={{ fontFamily: `var(${font.variable})` }}
        >
          <p className="text-2xl mb-2">The quick brown fox jumps over the lazy dog.</p>
          <p className="text-base">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
          <p className="text-base">abcdefghijklmnopqrstuvwxyz</p>
          <p className="text-base">0123456789 !@#$%^&*()</p>
        </div>
        
        {/* Configuration details */}
        <div className="space-y-2 text-sm">
          <div className="flex">
            <span className="font-medium w-24">Subsets:</span>
            <span>{font.config.subsets.join(', ')}</span>
          </div>
          
          {font.config.weights && (
            <div className="flex">
              <span className="font-medium w-24">Weights:</span>
              <span>{font.config.weights.join(', ')}</span>
            </div>
          )}
          
          {font.config.display && (
            <div className="flex">
              <span className="font-medium w-24">Display:</span>
              <span>{font.config.display}</span>
            </div>
          )}
          
          <div className="flex">
            <span className="font-medium w-24">Usage:</span>
            <span>{font.usage}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 