import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function BlogToSNS() {
  const { t } = useTranslation();
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
      toast.error(t('blogToSns.toast.platformLimit', { max: maxPlatforms }));
      return;
    }
    setPlatforms(newPlatforms);
  };

  const handleFunctionError = (code?: string, message?: string) => {
    if (code === 'QUOTA_EXCEEDED') {
      toast.error(message || t('common.quotaExceeded'));
      return true;
    }
    if (code === 'AUTH_REQUIRED') {
      navigate('/auth');
      return true;
    }
    if (code === 'VALIDATION_ERROR') {
      toast.error(message || t('common.validationError'));
      return true;
    }
    if (code === 'PROVIDER_ERROR' || code === 'INTERNAL_ERROR') {
      toast.error(message || t('common.providerError'));
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
      toast.error(t('blogToSns.toast.dailyLimit'));
      return;
    }

    if (platformLimitExceeded) {
      toast.error(t('blogToSns.toast.platformLimit', { max: maxPlatforms }));
      return;
    }

    if (platforms.length === 0) {
      toast.error(t('blogToSns.toast.selectPlatform'));
      return;
    }

    if (blogContent.trim().length < 10) {
      toast.error(t('blogToSns.toast.minLength'));
      return;
    }

    if (blogContent.length > 50000) {
      toast.error(t('blogToSns.toast.maxLength'));
      return;
    }

    if (blogLengthExceeded) {
      toast.error(t('blogToSns.toast.lengthExceeded'));
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
        toast.error(t('blogToSns.toast.failed'));
        return;
      }

      setResults(posts);
      toast.success(platforms.length > 1
        ? t('blogToSns.toast.successMultiple', { count: platforms.length })
        : t('blogToSns.toast.successSingle', { count: platforms.length })
      );
      await loadDailyUsage();
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(t('blogToSns.toast.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('blogToSns.title')}</h1>
          <p className="text-muted-foreground">
            {t('blogToSns.description')}
          </p>
        </div>

        {limits.daily_generations !== null && (
          <Alert className={`mb-6 ${isAtDailyLimit ? 'border-destructive' : ''}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isAtDailyLimit
                  ? t('blogToSns.dailyLimit.reached', { used: dailyUsed, total: limits.daily_generations })
                  : t('blogToSns.dailyLimit.usage', { used: dailyUsed, total: limits.daily_generations })
                }
              </span>
              {isAtDailyLimit && (
                <Button size="sm" asChild>
                  <Link to="/settings">{t('blogToSns.upgradeToPro')}</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('blogToSns.card.title')}</CardTitle>
              <CardDescription>
                {t('blogToSns.card.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blog-content">{t('blogToSns.form.blogText')}</Label>
                    <span className={`text-xs ${
                      blogLengthExceeded
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground'
                    }`}>
                      {blogContent.length.toLocaleString()} / {(maxBlogLength ?? 10000).toLocaleString()}
                    </span>
                  </div>
                  <Textarea
                    id="blog-content"
                    placeholder={t('blogToSns.form.blogPlaceholder')}
                    value={blogContent}
                    onChange={(e) => setBlogContent(e.target.value)}
                    disabled={isLoading}
                    rows={12}
                    className="resize-none font-mono text-sm"
                  />
                  {blogLengthExceeded && (
                    <p className="text-xs text-destructive">
                      {t('blogToSns.form.lengthExceeded')}
                    </p>
                  )}
                </div>

                <PlatformSelector
                  selected={platforms}
                  onChange={handlePlatformChange}
                  maxPlatforms={maxPlatforms}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!canGenerate || isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('blogToSns.button.converting')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('blogToSns.button.convert')}
                    </>
                  )}
                </Button>

                {!canGenerate && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">
                    {isAtDailyLimit
                      ? t('blogToSns.validation.dailyLimitReached')
                      : platforms.length === 0
                      ? t('blogToSns.validation.selectPlatform')
                      : blogLengthExceeded
                      ? t('blogToSns.validation.lengthExceeded')
                      : t('blogToSns.validation.pasteContent')}
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
                    <p className="font-medium">{t('blogToSns.loading.title')}</p>
                    <p className="text-sm text-muted-foreground">{t('blogToSns.loading.description')}</p>
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
                    <p className="font-medium text-lg mb-2">{t('blogToSns.empty.title')}</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('blogToSns.empty.description')}
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
