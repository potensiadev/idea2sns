import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Account() {
  const { user, plan, limits, dailyUsed } = useAppStore();
  const isPro = plan === 'pro';

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
        <Card className="mb-6">
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
                  {limits.variations_per_request}
                </span>
              </div>
            </div>
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
                <Button className="w-full" size="lg">
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
