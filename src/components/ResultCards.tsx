import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export type GeneratedContent = Record<string, string>;

interface ResultCardsProps {
  content: GeneratedContent;
}

const PLATFORM_CONFIG = {
  linkedin: {
    nameKey: "platforms.linkedin",
    icon: "💼",
    color: "border-blue-700",
    bgColor: "bg-blue-700/10",
  },
  twitter: {
    nameKey: "platforms.twitter",
    icon: "🐦",
    color: "border-sky-500",
    bgColor: "bg-sky-500/10",
  },
  threads: {
    nameKey: "platforms.threads",
    icon: "🧵",
    color: "border-slate-700",
    bgColor: "bg-slate-700/10",
  },
  reddit: {
    nameKey: "platforms.reddit",
    icon: "👽",
    color: "border-orange-500",
    bgColor: "bg-orange-500/10",
  },
} as const;

export const ResultCards = ({ content }: ResultCardsProps) => {
  const { t } = useTranslation();

  const copyToClipboard = (text: string, platformName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('resultCards.copied', { platform: platformName }));
  };

  const platformEntries = Object.entries(content);

  if (platformEntries.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {t('resultCards.noContent')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{t('resultCards.title')}</h2>
        <p className="text-muted-foreground">
          {platformEntries.length > 1
            ? t('resultCards.descriptionPlural', { count: platformEntries.length })
            : t('resultCards.description', { count: platformEntries.length })
          }
        </p>
      </div>

      <div className="grid gap-4">
        {platformEntries.map(([platform, text]) => {
          const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG] || {
            nameKey: platform,
            icon: "📝",
            color: "border-primary",
            bgColor: "bg-primary/10",
          };

          const platformName = config.nameKey.startsWith('platforms.')
            ? t(config.nameKey)
            : config.nameKey;

          return (
            <Card
              key={platform}
              className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${config.color} border-l-4`}
            >
              <CardHeader className={`${config.bgColor} pb-4`}>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <span className="font-bold">{platformName}</span>
                  </span>
                  <Badge variant="outline" className="font-semibold">
                    {text.length} {t('resultCards.chars')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="prose prose-sm max-w-none min-h-[100px]">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {text}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copyToClipboard(text, platformName)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {t('resultCards.copyToClipboard')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
