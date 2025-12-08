import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('generate.toast.platformLimit', { max: maxPlatforms }));
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

  const extractGeneratedContent = (response: any, selectedPlatforms: string[]): { content: GeneratedContent | null; failedPlatforms: string[] } => {
    const outputs = response?.data?.outputs ?? response?.outputs;
    if (!outputs || typeof outputs !== 'object') return { content: null, failedPlatforms: selectedPlatforms };

    const content: GeneratedContent = {};
    const failedPlatforms: string[] = [];

    selectedPlatforms.forEach((platform) => {
      const platformData = outputs[platform];
      const platformContent = platformData?.content;
      if (typeof platformContent === 'string' && platformContent.trim()) {
        content[platform] = platformContent;
      } else {
        failedPlatforms.push(platform);
      }
    });

    return {
      content: Object.keys(content).length > 0 ? content : null,
      failedPlatforms
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAtDailyLimit) {
      toast.error(t('generate.toast.dailyLimit'));
      return;
    }

    if (platformLimitExceeded) {
      toast.error(t('generate.toast.platformLimit', { max: maxPlatforms }));
      return;
    }

    if (platforms.length === 0) {
      toast.error(t('generate.toast.selectPlatform'));
      return;
    }

    if (!topic && !content) {
      toast.error(t('generate.toast.provideContent'));
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

      const { content: posts, failedPlatforms } = extractGeneratedContent(data, platforms);
      if (!posts) {
        toast.error(t('generate.toast.failed'));
        return;
      }

      setResults(posts);

      const successCount = platforms.length - failedPlatforms.length;
      if (failedPlatforms.length > 0) {
        toast.warning(t('generate.toast.partialSuccess', { success: successCount, failed: failedPlatforms.join(', ') }));
      } else {
        toast.success(platforms.length > 1
          ? t('generate.toast.successMultiple', { count: platforms.length })
          : t('generate.toast.successSingle', { count: platforms.length })
        );
      }
      await loadDailyUsage();
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(t('generate.toast.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('generate.title')}</h1>
          <p className="text-muted-foreground">
            {t('generate.description')}
          </p>
        </div>

        {limits.daily_generations !== null && (
          <Alert className={`mb-6 ${isAtDailyLimit ? 'border-destructive' : ''}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {isAtDailyLimit
                  ? t('generate.dailyLimit.reached', { used: dailyUsed, total: limits.daily_generations })
                  : t('generate.dailyLimit.usage', { used: dailyUsed, total: limits.daily_generations })
                }
              </span>
              {isAtDailyLimit && (
                <Button size="sm" asChild>
                  <Link to="/settings">{t('generate.upgradeToPro')}</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('generate.card.title')}</CardTitle>
              <CardDescription>
                {t('generate.card.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="topic">{t('generate.form.topic')}</Label>
                  <Input
                    id="topic"
                    placeholder={t('generate.form.topicPlaceholder')}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">{t('generate.form.content')}</Label>
                  <Textarea
                    id="content"
                    placeholder={t('generate.form.contentPlaceholder')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">{t('generate.form.tone')}</Label>
                  <Input
                    id="tone"
                    placeholder={t('generate.form.tonePlaceholder')}
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

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!canGenerate || isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('generate.button.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('generate.button.generate')}
                    </>
                  )}
                </Button>

                {!canGenerate && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center">
                    {isAtDailyLimit
                      ? t('generate.validation.dailyLimitReached')
                      : platforms.length === 0
                      ? t('generate.validation.selectPlatform')
                      : t('generate.validation.addContent')}
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
                    <p className="font-medium">{t('generate.loading.title')}</p>
                    <p className="text-sm text-muted-foreground">{t('generate.loading.description')}</p>
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
                    <p className="font-medium text-lg mb-2">{t('generate.empty.title')}</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {t('generate.empty.description')}
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
