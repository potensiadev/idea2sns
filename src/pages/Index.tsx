import { useState } from "react";
import { Hero } from "@/components/Hero";
import { ContentForm } from "@/components/ContentForm";
import { ResultCards } from "@/components/ResultCards";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedContent {
  reddit: string;
  threads: string;
  instagram: string;
  twitter: string;
  pinterest: string;
}

const Index = () => {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (
    topic: string,
    content: string,
    tone: string,
    platforms: string[]
  ) => {
    if (platforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-posts", {
        body: { topic, content, tone, platforms },
      });

      if (error) throw error;

      setGeneratedContent(data.posts);
      toast.success("Content generated successfully!");
    } catch (error: any) {
      console.error("Error generating content:", error);
      if (error.status === 429) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
      } else if (error.status === 402) {
        toast.error("AI credits depleted. Please add credits to continue.");
      } else {
        toast.error("Failed to generate content. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Hero />
        <ContentForm onGenerate={handleGenerate} isGenerating={isGenerating} />
        {generatedContent && <ResultCards content={generatedContent} />}
      </div>
    </div>
  );
};

export default Index;
