import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Create() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Content</h1>
          <p className="text-muted-foreground">
            Generate engaging social media posts for multiple platforms
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Post</TabsTrigger>
            <TabsTrigger value="blog">Blog to SNS</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Social Media Post</CardTitle>
                <CardDescription>
                  Create AI-powered content for your social media platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Blog to Social Media</CardTitle>
                <CardDescription>
                  Convert your blog posts into social media content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Feature coming soon...</p>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
}
