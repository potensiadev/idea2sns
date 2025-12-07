import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlatformSelector } from '@/components/PlatformSelector';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAppStore } from '@/store/useAppStore';
import { edgeFunctions } from '@/api/edgeFunctions';
import { toast } from 'sonner';
import { Sparkles, AlertCircle, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeneratedContent, ResultCards } from '@/components/ResultCards';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

const blogContentSchema = z.string()
  .min(10, 'Blog content must be at least 10 characters')
  .max(50000, 'Blog content must be less than 50,000 characters');

export default function BlogToSNS() {
  const {
    maxPlatforms,
    maxBlogLength,
    dailyUsed,
    limits,
    loadDailyUsage,
  } = useAppStore();

  const navigate = useNavigate();

  const [blogContent, setBlogContent] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent | null>(null);

  const isAtDailyLimit = limits.daily_generations !== null && dailyUsed >= limits.daily_generations;
  const platformLimitExceeded = maxPlatforms !== null && platforms.length > maxPlatforms;
  const blogLengthExceeded = maxBlogLength !== null && blogContent.length > maxBlogLength;
  const canGenerate = !isAtDailyLimit && !platformLimitExceeded && !blogLengthExceeded && platforms.length > 0 && blogContent.trim();

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

    const contentValidation = blogContentSchema.safeParse(blogContent);
    if (!contentValidation.success) {
      toast.error(contentValidation.error.errors[0].message);
      return;
    }

    if (blogLengthExceeded) {
      toast.error('Blog content exceeds your plan limit');
      return;
    }

    try {
      setIsLoading(true);
      setResults(null);

      const { data } = await edgeFunctions.blogToSns({
        type: 'blog',
        blogContent: blogContent.trim(),
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
          <h1 className="text-3xl font-bold mb-2">Blog to Social Media</h1>
          <p className="text-muted-foreground">
            Convert your blog posts into optimized social media content
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
              <CardTitle>Blog Content</CardTitle>
              <CardDescription>
                Paste your blog text to generate platform-optimized posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blog-content">Blog Text</Label>
                    {maxBlogLength && (
                      <span className={`text-xs ${
                        blogLengthExceeded
                          ? 'text-destructive font-medium'
                          : 'text-muted-foreground'
                      }`}>
                        {blogContent.length.toLocaleString()} / {maxBlogLength.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Textarea
                    id="blog-content"
                    placeholder="Paste your blog post content here..."
                    value={blogContent}
                    onChange={(e) => setBlogContent(e.target.value)}
                    disabled={isLoading}
                    rows={12}
                    className="resize-none font-mono text-sm"
                  />
                  {blogLengthExceeded && (
                    <p className="text-xs text-destructive">
                      Content exceeds your plan limit. Upgrade to Pro for longer posts.
                    </p>
                  )}
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
                      Converting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Convert to Social Posts
                    </>
                  )}
                </Button>

                {!canGenerate && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">
                    {isAtDailyLimit
                      ? 'Daily limit reached'
                      : platforms.length === 0
                      ? 'Select at least one platform'
                      : blogLengthExceeded
                      ? 'Blog content exceeds limit'
                      : 'Paste blog content to continue'}
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
                    <p className="font-medium">Converting your blog post...</p>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </div>
                </div>
              </Card>
            )}

            {!isLoading && !results && (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4 p-8">
                  <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg mb-2">Ready to convert?</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Paste your blog content to generate platform-optimized social media posts
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
