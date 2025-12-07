import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlatformSelector } from '@/components/PlatformSelector';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAppStore } from '@/store/useAppStore';
import { edgeFunctions } from '@/api/edgeFunctions';
import { toast } from 'sonner';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeneratedContent, ResultCards } from '@/components/ResultCards';
import { Link, useNavigate } from 'react-router-dom';

export default function Generate() {
  const {
    maxPlatforms,
    dailyUsed,
    limits,
    loadDailyUsage,
  } = useAppStore();

  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent | null>(null);

  const isAtDailyLimit = limits.daily_generations !== null && dailyUsed >= limits.daily_generations;
  const platformLimitExceeded = maxPlatforms !== null && platforms.length > maxPlatforms;
  const canGenerate = !isAtDailyLimit && !platformLimitExceeded && platforms.length > 0 && (topic || content);

  const handlePlatformChange = (newPlatforms: string[]) => {
    if (maxPlatforms !== null && newPlatforms.length > maxPlatforms) {
      toast.error(`You can select up to ${maxPlatforms} platform${maxPlatforms === 1 ? '' : 's'}`);
      return;
    }
    setPlatforms(newPlatforms);
  };

  const handleFunctionError = (code?: string, message?: string) => {
    if (code === 'QUOTA_EXCEEDED') {
      toast.error(message || 'You reached your plan limits.');
      return true;
    }
    if (code === 'AUTH_REQUIRED') {
      navigate('/auth');
      return true;
    }
    if (code === 'VALIDATION_ERROR') {
      toast.error(message || 'Please check your input and try again.');
      return true;
    }
    if (code === 'PROVIDER_ERROR' || code === 'INTERNAL_ERROR') {
      toast.error(message || 'Failed to generate content. Please try again.');
      return true;
    }
    return false;
  };

  const extractGeneratedContent = (response: any): GeneratedContent | null => {
    const outputs = response?.data?.outputs ?? response?.outputs;
    if (!outputs || typeof outputs !== 'object') return null;

    const content: GeneratedContent = {};
    Object.entries(outputs).forEach(([platform, value]) => {
      const platformContent = (value as any)?.content;
      if (typeof platformContent === 'string' && platformContent.trim()) {
        content[platform] = platformContent;
      }
    });

    return Object.keys(content).length > 0 ? content : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAtDailyLimit) {
      toast.error('Daily limit reached');
      return;
    }

    if (platformLimitExceeded) {
      toast.error(`You can select up to ${maxPlatforms} platforms`);
      return;
    }

    if (platforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (!topic && !content) {
      toast.error('Please provide a topic or content');
      return;
    }

    try {
      setIsLoading(true);
      setResults(null);

      const { data } = await edgeFunctions.generatePost({
        type: 'simple',
        topic: topic || 'General post',
        content: content || '',
        tone: tone || 'professional',
        platforms,
        brandVoiceId: null,
      });

      if (data?.status === 'error') {
        const code = data.error?.code;
        if (handleFunctionError(code, data.error?.message)) return;
        return;
      }

      const posts = extractGeneratedContent(data);
      if (!posts) {
        toast.error('Failed to generate content. Please try again.');
        return;
      }

      setResults(posts);
      toast.success(`Generated content for ${platforms.length} platform${platforms.length > 1 ? 's' : ''}!`);
      await loadDailyUsage();
    } catch (err) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'An error occurred while generating content';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Generate Content</h1>
          <p className="text-muted-foreground">
            Transform your ideas into engaging social media posts
          </p>
        </div>

        {limits.daily_generations !== null && (
          <Alert className={`mb-6 ${isAtDailyLimit ? 'border-destructive' : ''}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isAtDailyLimit
                  ? `Daily limit reached (${dailyUsed}/${limits.daily_generations}). Upgrade to Pro for unlimited generations!`
                  : `${dailyUsed}/${limits.daily_generations} generations used today`
                }
              </span>
              {isAtDailyLimit && (
                <Button size="sm" asChild>
                  <Link to="/settings">Upgrade to Pro</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Social Media Post</CardTitle>
              <CardDescription>
                Generate AI-powered content optimized for each platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic or Title</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., New product launch, Company milestone..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content Details (Optional)</Label>
                  <Textarea
                    id="content"
                    placeholder="Add more context, key points, or details..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tone (Optional)</Label>
                  <Input
                    id="tone"
                    placeholder="e.g., Professional, Casual, Friendly..."
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <PlatformSelector
                  selected={platforms}
                  onChange={handlePlatformChange}
                  maxPlatforms={maxPlatforms}
                />

                {maxPlatforms !== null && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    Select up to {maxPlatforms} platforms
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!canGenerate || isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Posts
                    </>
                  )}
                </Button>

                {!canGenerate && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">
                    {isAtDailyLimit
                      ? 'Daily limit reached'
                      : platforms.length === 0
                      ? 'Select at least one platform'
                      : 'Add a topic or content to continue'}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <div>
            {isLoading && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <div>
                    <p className="font-medium">Generating your content...</p>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </div>
                </div>
              </Card>
            )}

            {!isLoading && !results && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4 p-8">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg mb-2">Ready to create?</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Fill in the form and select your platforms to generate optimized social media content
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {!isLoading && results && (
              <ResultCards content={results} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
