import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckoutButton } from '@/app/(logged-in)/billing/components/checkout-button';
import { CancelSubscriptionButton } from '@/app/(logged-in)/billing/components/cancel-subscription-button';
import { DowngradeButton } from '@/app/(logged-in)/billing/components/downgrade-button';
import { getSubscriptionProducts, getUserSubscription } from '@/lib/actions/subscription';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe';
import { getUser } from '@/lib/db/queries';

export default async function BillingPage() {
  const user = await getUser();
  if (!user) {
    return notFound();
  }

  // Get the user's current subscription
  const subscription = await getUserSubscription();
  const products = await getSubscriptionProducts();

  // Determine the user's current tier
  const currentTier = subscription?.product?.tier || SUBSCRIPTION_TIERS.FREE;

  // Format price function
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return 'Contact us';
    return price === 0 ? 'Free' : `$${price}/mo`;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription plan and billing information.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Current Plan Info */}
          <Card className="overflow-hidden">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="p-3">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg">{subscription?.product?.name || 'Free'}</p>
                </div>
                <div className="p-3">
                  <p className="text-sm text-muted-foreground">Billing Period</p>
                  <p className="text-lg">
                    {currentTier !== SUBSCRIPTION_TIERS.FREE ? 'Monthly' : 'N/A'}
                  </p>
                </div>
                {currentTier !== SUBSCRIPTION_TIERS.FREE && (
                  <>
                    <div className="p-3">
                      <p className="text-sm text-muted-foreground">Next Payment</p>
                      <p className="text-lg">
                        {subscription?.subscription?.currentPeriodEnd
                          ? new Date(
                              subscription.subscription.currentPeriodEnd
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-lg">{formatPrice(subscription?.product?.price || 0)}</p>
                    </div>
                    <div className="flex items-center justify-end">
                      <CancelSubscriptionButton />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plans */}
          <div className="space-y-4">
            <h3 className="text-xl">Available Plans</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map(product => {
                const isCurrentPlan = product.tier === currentTier;
                const isUpgrade =
                  product.tier !== SUBSCRIPTION_TIERS.FREE && product.tier !== currentTier;
                const isFree = product.tier === SUBSCRIPTION_TIERS.FREE;
                const isEnterprise = product.tier === SUBSCRIPTION_TIERS.ENTERPRISE;

                return (
                  <Card
                    key={product.id}
                    className={`transition-all duration-200 flex flex-col border ${isCurrentPlan ? 'border-primary/50' : 'border hover:border-primary/20'}`}
                  >
                    <CardHeader>
                      <CardTitle>
                        <span className="text-muted-foreground">{product.name}</span>
                      </CardTitle>
                      <div className="mt-2 flex items-baseline text-2xl">
                        {formatPrice(product.price)}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2 text-sm">
                        {(product.features as string[]).map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="mt-auto">
                      {isCurrentPlan ? (
                        <Button variant="outline" disabled className="w-full">
                          Current Plan
                        </Button>
                      ) : isEnterprise ? (
                        <Button variant="default" className="w-full" asChild>
                          <a href="mailto:filippo.pedrazzini@joandko.io?subject=Kosuke%20Inquiry">
                            Contact Us
                          </a>
                        </Button>
                      ) : isUpgrade ? (
                        <CheckoutButton priceId={product.stripePriceId} />
                      ) : isFree && !isCurrentPlan ? (
                        <DowngradeButton className="w-full" />
                      ) : (
                        <Button variant="outline" disabled className="w-full">
                          Not Available
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
