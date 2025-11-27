import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function BrandVoice() {
  const { brandVoiceAllowed, plan } = useAppStore();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Brand Voice</h1>
          <p className="text-muted-foreground">
            Define and manage your unique brand voice for consistent content
          </p>
        </div>

        {!brandVoiceAllowed && (
          <Alert className="mb-6">
            <Lock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Brand Voice is a Pro feature. Upgrade to unlock this capability.</span>
              <Button size="sm" asChild>
                <Link to="/account">Upgrade to Pro</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Brand Voice Configuration</CardTitle>
            <CardDescription>
              Create a consistent voice across all your social media platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Feature coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
