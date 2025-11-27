import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlatformSelector } from '@/components/PlatformSelector';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAppStore } from '@/store/useAppStore';
import { edgeFunctions } from '@/api/edgeFunctions';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sparkles, AlertCircle, FileText, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeneratedContent, ResultCards } from '@/components/ResultCards';
import { Link } from 'react-router-dom';
import { z } from 'zod';

// Validation schemas
const blogContentSchema = z.string()
  .min(10, 'Blog content must be at least 10 characters')
  .max(50000, 'Blog content must be less than 50,000 characters');

const urlSchema = z.string()
  .url('Please enter a valid URL')
  .max(2048, 'URL is too long');

export default function Create() {
  const { brandVoiceAllowed, maxPlatforms, maxBlogLength, dailyUsed, limits, loadDailyUsage } = useAppStore();
  
  const [activeTab, setActiveTab] = useState('create');
  
  // Multi-platform form state
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [tone, setTone] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [useBrandVoice, setUseBrandVoice] = useState(false);
  
  // Blog-to-SNS form state
  const [blogSourceType, setBlogSourceType] = useState<'text' | 'url'>('text');
  const [blogUrl, setBlogUrl] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogTone, setBlogTone] = useState('');
  const [blogPlatforms, setBlogPlatforms] = useState<string[]>([]);
  const [blogUseBrandVoice, setBlogUseBrandVoice] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [results, setResults] = useState<GeneratedContent | null>(null);

  const isAtDailyLimit = limits.daily_generations !== null && dailyUsed >= limits.daily_generations;
  const canGenerate = !isAtDailyLimit && platforms.length > 0 && (topic || content);

  const handlePlatformChange = (newPlatforms: string[]) => {
    if (maxPlatforms !== null && newPlatforms.length > maxPlatforms) {
      setUpgradeReason(`Your plan allows ${maxPlatforms} platform${maxPlatforms === 1 ? '' : 's'} per generation.`);
      setShowUpgradeModal(true);
      return;
    }
    setPlatforms(newPlatforms);
  };

  const handleBlogPlatformChange = (newPlatforms: string[]) => {
    if (maxPlatforms !== null && newPlatforms.length > maxPlatforms) {
      setUpgradeReason(`Your plan allows ${maxPlatforms} platform${maxPlatforms === 1 ? '' : 's'} per generation.`);
      setShowUpgradeModal(true);
      return;
    }
    setBlogPlatforms(newPlatforms);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isAtDailyLimit) {
      toast.error('Daily generation limit reached. Upgrade to Pro for unlimited generations!');
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

      const { data, error } = await edgeFunctions.generatePost({
        type: 'simple',
        topic: topic || 'General post',
        content: content || '',
        tone: tone || 'professional',
        platforms,
        brandVoiceId: useBrandVoice ? null : null, // Will be null for now until brand voice is implemented
      });

      if (error) {
        toast.error(error);
        return;
      }

      if (data && data.posts) {
        setResults(data.posts);
        toast.success(`Generated content for ${platforms.length} platform${platforms.length > 1 ? 's' : ''}!`);
        
        // Refresh daily usage
        await loadDailyUsage();
      } else {
        toast.error('Failed to generate content. Please try again.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('An error occurred while generating content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlogToSns = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if feature is allowed
    if (!limits.blog_to_sns) {
      setUpgradeReason('Blog-to-SNS is a Pro feature. Upgrade to unlock this capability.');
      setShowUpgradeModal(true);
      return;
    }

    if (isAtDailyLimit) {
      toast.error('Daily generation limit reached. Upgrade to Pro for unlimited generations!');
      return;
    }

    if (blogPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    // Get blog content based on source type
    let contentToProcess = '';
    
    if (blogSourceType === 'url') {
      // Validate URL
      const urlValidation = urlSchema.safeParse(blogUrl);
      if (!urlValidation.success) {
        toast.error(urlValidation.error.errors[0].message);
        return;
      }
      
      // For now, ask user to paste content (URL fetching would need a backend function)
      toast.error('URL fetching coming soon! Please use the Text option and paste your blog content.');
      return;
    } else {
      contentToProcess = blogContent;
    }

    // Validate blog content
    const contentValidation = blogContentSchema.safeParse(contentToProcess);
    if (!contentValidation.success) {
      toast.error(contentValidation.error.errors[0].message);
      return;
    }

    // Check blog length limit
    if (maxBlogLength !== null && contentToProcess.length > maxBlogLength) {
      setUpgradeReason(
        `Your plan allows blog posts up to ${maxBlogLength.toLocaleString()} characters. This post is ${contentToProcess.length.toLocaleString()} characters.`
      );
      setShowUpgradeModal(true);
      return;
    }

    try {
      setIsLoading(true);
      setResults(null);

      const { data, error } = await edgeFunctions.blogToSns({
        type: 'blog',
        blogContent: contentToProcess,
        platforms: blogPlatforms,
        brandVoiceId: blogUseBrandVoice ? null : null,
      });

      if (error) {
        toast.error(error);
        return;
      }

      if (data && data.posts) {
        setResults(data.posts);
        toast.success(`Generated content for ${blogPlatforms.length} platform${blogPlatforms.length > 1 ? 's' : ''}!`);
        
        await loadDailyUsage();
      } else {
        toast.error('Failed to generate content. Please try again.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('An error occurred while generating content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVariations = () => {
    setActiveTab('variations');
    toast.info('Variations feature coming soon!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Content</h1>
          <p className="text-muted-foreground">
            Generate engaging social media posts for multiple platforms
          </p>
        </div>

        {/* Usage Warning */}
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
                  <Link to="/account">Upgrade to Pro</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Post</TabsTrigger>
            <TabsTrigger value="blog">Blog to SNS</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Generate Social Media Post</CardTitle>
                  <CardDescription>
                    Create AI-powered content optimized for each platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Topic */}
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

                    {/* Content */}
                    <div className="space-y-2">
                      <Label htmlFor="content">Content Details (Optional)</Label>
                      <Textarea
                        id="content"
                        placeholder="Add more context, key points, or details you want to include..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isLoading}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    {/* Tone */}
                    <div className="space-y-2">
                      <Label htmlFor="tone">Tone (Optional)</Label>
                      <Input
                        id="tone"
                        placeholder="e.g., Professional, Casual, Friendly, Exciting..."
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Platform Selection */}
                    <PlatformSelector
                      selected={platforms}
                      onChange={handlePlatformChange}
                      maxPlatforms={maxPlatforms}
                    />

                    {/* Brand Voice Toggle */}
                    {brandVoiceAllowed && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="brand-voice" className="text-base">
                            Use Brand Voice
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Apply your saved brand voice to all posts
                          </p>
                        </div>
                        <Switch
                          id="brand-voice"
                          checked={useBrandVoice}
                          onCheckedChange={setUseBrandVoice}
                          disabled={isLoading}
                        />
                      </div>
                    )}

                    {/* Submit Button */}
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

              {/* Results */}
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
                  <div className="space-y-6">
                    <ResultCards content={results} />
                    
                    {/* Create Variations Button */}
                    <Card>
                      <CardContent className="pt-6">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleCreateVariations}
                        >
                          Create More Variations
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            {/* Feature Gate Alert */}
            {!limits.blog_to_sns && (
              <Alert className="mb-6 border-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Blog-to-SNS is a Pro feature. Upgrade to unlock this capability!</span>
                  <Button size="sm" asChild>
                    <Link to="/account">Upgrade to Pro</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card className={!limits.blog_to_sns ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader>
                  <CardTitle>Blog to Social Media</CardTitle>
                  <CardDescription>
                    Convert your blog posts into optimized social media content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBlogToSns} className="space-y-6">
                    {/* Source Type Selector */}
                    <div className="space-y-3">
                      <Label>Source Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={blogSourceType === 'text' ? 'default' : 'outline'}
                          className="h-auto py-4 flex flex-col gap-2"
                          onClick={() => setBlogSourceType('text')}
                          disabled={isLoading}
                        >
                          <FileText className="h-5 w-5" />
                          <span className="text-sm font-medium">Paste Text</span>
                        </Button>
                        <Button
                          type="button"
                          variant={blogSourceType === 'url' ? 'default' : 'outline'}
                          className="h-auto py-4 flex flex-col gap-2"
                          onClick={() => setBlogSourceType('url')}
                          disabled={isLoading}
                        >
                          <LinkIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">From URL</span>
                        </Button>
                      </div>
                    </div>

                    {/* URL Input */}
                    {blogSourceType === 'url' && (
                      <div className="space-y-2">
                        <Label htmlFor="blog-url">Blog URL</Label>
                        <Input
                          id="blog-url"
                          type="url"
                          placeholder="https://yourblog.com/post"
                          value={blogUrl}
                          onChange={(e) => setBlogUrl(e.target.value)}
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll fetch and extract the content from this URL
                        </p>
                      </div>
                    )}

                    {/* Text Content Input */}
                    {blogSourceType === 'text' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="blog-content">Blog Content</Label>
                          {maxBlogLength && (
                            <span className={`text-xs ${
                              blogContent.length > maxBlogLength 
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
                          rows={8}
                          className="resize-none font-mono text-sm"
                        />
                        {maxBlogLength && blogContent.length > maxBlogLength && (
                          <p className="text-xs text-destructive">
                            Content exceeds your plan limit. Upgrade to Pro for longer posts.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tone */}
                    <div className="space-y-2">
                      <Label htmlFor="blog-tone">Tone (Optional)</Label>
                      <Input
                        id="blog-tone"
                        placeholder="e.g., Professional, Casual, Engaging..."
                        value={blogTone}
                        onChange={(e) => setBlogTone(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Platform Selection */}
                    <PlatformSelector
                      selected={blogPlatforms}
                      onChange={handleBlogPlatformChange}
                      maxPlatforms={maxPlatforms}
                    />

                    {/* Brand Voice Toggle */}
                    {brandVoiceAllowed && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="blog-brand-voice" className="text-base">
                            Use Brand Voice
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Apply your saved brand voice to all posts
                          </p>
                        </div>
                        <Switch
                          id="blog-brand-voice"
                          checked={blogUseBrandVoice}
                          onCheckedChange={setBlogUseBrandVoice}
                          disabled={isLoading}
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={
                        !limits.blog_to_sns ||
                        isAtDailyLimit ||
                        isLoading ||
                        blogPlatforms.length === 0 ||
                        (blogSourceType === 'text' && !blogContent) ||
                        (blogSourceType === 'url' && !blogUrl) ||
                        (maxBlogLength !== null && blogContent.length > maxBlogLength)
                      }
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
                  </form>
                </CardContent>
              </Card>

              {/* Results */}
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
                          Paste your blog content or enter a URL to generate platform-optimized social media posts
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {!isLoading && results && (
                  <div className="space-y-6">
                    <ResultCards content={results} />
                    
                    <Card>
                      <CardContent className="pt-6">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleCreateVariations}
                        >
                          Create More Variations
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Variations</CardTitle>
                <CardDescription>
                  Create multiple versions of your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upgrade Modal */}
        <AlertDialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Upgrade to Pro
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-4">
                <p>{upgradeReason || 'Upgrade to unlock this feature.'}</p>
                <p>
                  Pro plan includes unlimited platforms, unlimited daily generations, blog-to-SNS conversion, brand voice, and more!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link to="/account">
                  View Plans
                </Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
