import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function History() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Generation History</h1>
          <p className="text-muted-foreground">
            View and manage your previously generated content
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Content History</CardTitle>
            <CardDescription>
              All your generated posts and variations
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
