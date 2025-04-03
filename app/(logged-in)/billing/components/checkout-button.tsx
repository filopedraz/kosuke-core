'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckoutButtonProps {
  priceId: string | null | undefined;
}

export function CheckoutButton({ priceId }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (!priceId) {
      console.error('No price ID provided');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/subscription/checkout?priceId=${priceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned from the API');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      className="w-full"
      onClick={handleCheckout}
      disabled={isLoading || !priceId}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {isLoading ? 'Processing...' : 'Upgrade'}
    </Button>
  );
}
