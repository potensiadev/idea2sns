import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { edgeFunctions } from '@/api/edgeFunctions';
import { cn } from '@/lib/utils';

export default function Account() {
  const { user, plan, limits, dailyUsed, loadProfileAndLimits } = useAppStore();
  const [promoCode, setPromoCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminActivating, setIsAdminActivating] = useState(false);
  const isPro = plan === 'pro';

  const handleActivatePromo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await edgeFunctions.activatePromo({ code: promoCode.trim() });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Pro activated successfully!');
      setPromoCode('');
      await loadProfileAndLimits();
    } catch (err) {
      console.error('Promo activation error', err);
      toast.error('Failed to activate promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminUpgrade = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    if (!import.meta.env.VITE_ADMIN_UPGRADE_SECRET) {
      toast.error('Admin secret not configured');
      return;
    }

    try {
      setIsAdminActivating(true);
      const { error } = await edgeFunctions.adminUpgradeUser({
        userId: user.id,
        plan: 'pro',
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success('Pro activated successfully!');
      await loadProfileAndLimits();
    } catch (err) {
      console.error('Admin upgrade error', err);
      toast.error('Failed to request activation');
    } finally {
      setIsAdminActivating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and subscription
          </p>
        </div>

        {/* Current Plan */}
        <Card className="mb-6" id="promo">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Plan</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Badge variant={isPro ? "default" : "secondary"} className="text-lg px-4 py-2">
                {isPro ? 'Pro' : 'Free'}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Daily Generations</span>
                <span className="text-sm font-medium">
                  {dailyUsed} / {limits.daily_generations || '∞'} used today
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Max Platforms per Request</span>
                <span className="text-sm font-medium">
                  {limits.max_platforms_per_request || 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Brand Voice</span>
                <span className="text-sm font-medium">
                  {limits.brand_voice ? <Check className="h-4 w-4 text-green-500" /> : '✕'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Blog to SNS</span>
                <span className="text-sm font-medium">
                  {limits.blog_to_sns ? <Check className="h-4 w-4 text-green-500" /> : '✕'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Max Blog Length</span>
                <span className="text-sm font-medium">
                  {limits.max_blog_length ? `${limits.max_blog_length} chars` : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Variations per Request</span>
                <span className="text-sm font-medium">
                  {limits.variations_per_request || 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">History Limit</span>
                <span className="text-sm font-medium">
                  {limits.history_limit ?? 'Unlimited'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activate Promo Code</CardTitle>
            <CardDescription>Apply a promo code to unlock Pro features</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivatePromo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promo-code">Enter Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="promo-code"
                    placeholder="Enter Promo Code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Activating...' : 'Activate'}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Applied instantly. You may need to refresh to see updated limits.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan Limits</CardTitle>
            <CardDescription>What your current plan includes</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Daily Generations', value: limits.daily_generations ?? 'Unlimited' },
              { label: 'Platforms per Request', value: limits.max_platforms_per_request ?? 'Unlimited' },
              { label: 'Max Blog Length', value: limits.max_blog_length ?? 'Unlimited' },
              { label: 'Variations per Request', value: limits.variations_per_request ?? 'Unlimited' },
              { label: 'History Limit', value: limits.history_limit ?? 'Unlimited' },
              { label: 'Brand Voice', value: limits.brand_voice ? 'Enabled' : 'Disabled' },
            ].map((item) => (
              <div key={item.label} className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium text-lg">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upgrade CTA */}
        {!isPro && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Upgrade to Pro
              </CardTitle>
              <CardDescription>
                Unlock unlimited generations and premium features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited daily generations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">All platforms supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Brand Voice feature</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </li>
                </ul>
                <div className="space-y-2">
                  <Button className="w-full" size="lg" onClick={() => document.getElementById('promo')?.scrollIntoView({ behavior: 'smooth' })}>
                    Enter Promo Code
                  </Button>
                  <Button
                    variant="outline"
                    className={cn('w-full', isAdminActivating && 'opacity-75')}
                    size="lg"
                    onClick={handleAdminUpgrade}
                    disabled={isAdminActivating}
                  >
                    {isAdminActivating ? 'Requesting...' : 'Request Pro Activation'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
