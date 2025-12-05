import type { Platform } from "./platformRules.ts";

export type BrandVoice = { extracted_style: Record<string, unknown> | null; label?: string | null } | null;

export type BrandVoiceAnalysisPromptInput = { samples: string[] };

export type VariationStyle =
  | "short"
  | "long"
  | "casual"
  | "formal"
  | "hook-first"
  | "emotional";

export type RequestShape =
  | {
      type: "simple";
      topic: string;
      content: string;
      tone: string;
      platforms: Platform[];
      brandVoiceId?: string | null;
    }
  | {
      type: "blog";
      blogContent: string;
      platforms: Platform[];
      brandVoiceId?: string | null;
    };

export type PromptBuilderInput = {
  request: RequestShape;
  platformRules: Record<Platform, string>;
  brandVoice: BrandVoice;
};

export function promptBuilder({ request, platformRules, brandVoice }: PromptBuilderInput): string {
  const brandVoiceCue = brandVoice?.extracted_style
    ? `\nBrand voice hints (apply across all outputs): ${JSON.stringify(brandVoice.extracted_style)}`
    : "";

  if (request.type === "simple") {
    return `You are an expert social media strategist. Generate JSON with one entry per requested platform key, each containing\na platform-optimized post.\n` +
      `Rules per platform (strictly follow): ${JSON.stringify(platformRules)}${brandVoiceCue}\n` +
      `Input:\n- Topic: ${request.topic}\n- Supporting content: ${request.content}\n- Tone: ${request.tone}\n- Platforms: ${request.platforms.join(", ")}.\n` +
      `Return JSON: { "platform": "post text" } with exactly the requested platform keys and nothing else.`;
  }

  return `You are an expert social media strategist. Convert the following blog content into platform-optimized posts.\n` +
    `Rules per platform: ${JSON.stringify(platformRules)}${brandVoiceCue}\n` +
    `Blog content:\n${request.blogContent}\n` +
    `Return JSON: { "platform": "post text" } with exactly the requested platform keys.`;
}

export type VariationPromptInput = { baseText: string; style: VariationStyle; brandVoice: BrandVoice };

export function variationPromptBuilder({ baseText, style, brandVoice }: VariationPromptInput): string {
  const brandVoiceCue = brandVoice?.extracted_style
    ? `\nMatch this brand voice: ${JSON.stringify(brandVoice.extracted_style)}`
    : "";

  const styleDirectives: Record<VariationStyle, string> = {
    short: "Create a tighter, more concise version.",
    long: "Expand with more detail while staying focused.",
    casual: "Rewrite in a warmer, conversational tone.",
    formal: "Rewrite in a polished, formal tone.",
    "hook-first": "Start with a strong hook, then deliver the core message.",
    emotional: "Amplify emotional resonance and feeling without exaggeration.",
  };

  return (
    `You are an expert social content editor. Produce a single rewritten variation in plain text only.` +
    `${brandVoiceCue}\n` +
    `Base text: ${baseText}\n` +
    `Style: ${styleDirectives[style]}\n` +
    `Return ONLY the rewritten text with no JSON, no labels, and no commentary.`
  );
}

export function brandVoiceAnalysisPromptBuilder({ samples }: BrandVoiceAnalysisPromptInput): string {
  const joined = samples
    .map((sample, index) => `Sample ${index + 1}:
${sample}`)
    .join("\n\n");

  return (
    `You are an expert linguist and brand voice analyst. Analyze the provided writing samples and extract a concise JSON summary of the brand voice traits.` +
    `\nFocus on reusable patterns, not specific content. Avoid hallucinations.` +
    `\nSamples:\n${joined}\n` +
    `Return strict JSON with this shape:\n` +
    `{
  "tone": string, // tone adjectives and mood
  "sentenceStyle": string, // sentence length, structure, cadence
  "vocabulary": string, // notable vocabulary patterns, jargon, or phrasing
  "format": string, // formatting preferences (bullets, line breaks, emojis)
  "strictness": number // 0-1 representing how strictly to enforce this voice
}` +
    `\nDo not include any other commentary. Respond with JSON only.`
  );
}
