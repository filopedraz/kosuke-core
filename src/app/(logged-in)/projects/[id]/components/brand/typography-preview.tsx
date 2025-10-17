'use client';

interface TypographyPreviewProps {
  fontVariable: string;
  weights?: number[];
}

export default function TypographyPreview({ 
  fontVariable,
  weights = [400, 700]
}: TypographyPreviewProps) {
  return (
    <div 
      className="p-5 border rounded-md space-y-4"
      style={{ fontFamily: `var(${fontVariable})` }}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Heading 1</h1>
        <h2 className="text-2xl font-semibold">Heading 2</h2>
        <h3 className="text-xl font-medium">Heading 3</h3>
        <h4 className="text-lg font-medium">Heading 4</h4>
      </div>
      
      <div className="space-y-2">
        <p className="text-base">
          Regular paragraph text. The quick brown fox jumps over the lazy dog.
          This is a sample of body text at the default size and weight.
        </p>
        
        <p className="text-sm">
          Small text. The quick brown fox jumps over the lazy dog.
          This sample shows smaller text that might be used for captions or notes.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {weights.map(weight => (
          <div key={weight} className="space-y-1">
            <p className="text-sm text-muted-foreground">Weight: {weight}</p>
            <p style={{ fontWeight: weight }}>
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 