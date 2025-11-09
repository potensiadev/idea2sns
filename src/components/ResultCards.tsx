import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { GeneratedContent } from "@/pages/Index";
import { Badge } from "@/components/ui/badge";

interface ResultCardsProps {
  content: GeneratedContent;
}

const PLATFORM_CONFIG = {
  reddit: {
    name: "Reddit",
    icon: "🔴",
    color: "border-platform-reddit",
    bgColor: "bg-platform-reddit/10",
  },
  threads: {
    name: "Threads",
    icon: "⚫",
    color: "border-platform-threads",
    bgColor: "bg-platform-threads/10",
  },
  instagram: {
    name: "Instagram",
    icon: "📸",
    color: "border-platform-instagram",
    bgColor: "bg-platform-instagram/10",
  },
  twitter: {
    name: "Twitter (X)",
    icon: "🐦",
    color: "border-platform-twitter",
    bgColor: "bg-platform-twitter/10",
  },
  pinterest: {
    name: "Pinterest",
    icon: "📌",
    color: "border-platform-pinterest",
    bgColor: "bg-platform-pinterest/10",
  },
};

export const ResultCards = ({ content }: ResultCardsProps) => {
  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${platform} post copied to clipboard!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Generated Posts</h2>
        <p className="text-muted-foreground">
          Copy and paste these optimized posts to each platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(content).map(([platform, text]) => {
          const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
          return (
            <Card
              key={platform}
              className={`shadow-md hover:shadow-lg transition-all duration-300 border-2 ${config.color}`}
            >
              <CardHeader className={`${config.bgColor}`}>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    {config.name}
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {text.length} chars
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none mb-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(text, config.name)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
