'use client';

import { useState } from 'react';
import { Check, Copy, Edit2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CssVariable {
  name: string;
  value: string;
  description?: string;
}

interface ColorCardProps {
  colorVar: CssVariable;
  currentValue: string;
  onChange: (value: string) => void;
}

export default function ColorCard({ colorVar, currentValue, onChange }: ColorCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentValue);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSave = () => {
    onChange(inputValue);
    setIsEditing(false);
  };
  
  const formatColorName = (name: string) => {
    // Strip the CSS variable prefix and format as title case
    return name.replace(/^--/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <Card className="overflow-hidden">
      <div 
        className="h-32 w-full" 
        style={{ backgroundColor: currentValue }}
      />
      <CardContent className="pt-6">
        <h3 className="font-medium">{formatColorName(colorVar.name)}</h3>
        <p className="text-sm text-muted-foreground">{colorVar.name}</p>
        
        {isEditing ? (
          <div className="mt-4 flex space-x-2">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8"
            />
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        ) : (
          <div className="flex mt-4 justify-between items-center">
            <p className="font-mono text-sm">{currentValue}</p>
            
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setIsEditing(true)}
                title="Edit color"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => copyToClipboard(currentValue)}
                title="Copy value"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-muted/50 p-2 flex justify-between items-center text-xs">
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        
        {colorVar.value !== currentValue && (
          <span className="text-xs text-amber-500">Modified</span>
        )}
      </CardFooter>
    </Card>
  );
} 