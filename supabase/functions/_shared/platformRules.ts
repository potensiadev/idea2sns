import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const allowedPlatforms = ["twitter", "linkedin", "threads", "reddit"] as const;

export type Platform = typeof allowedPlatforms[number];

export const platformEnum = z.enum(allowedPlatforms);

export const platformModelMap: Record<string, { provider: "anthropic" | "openai"; model: string }> = {
  twitter: { provider: "anthropic", model: "claude-3-5-sonnet-latest" },
  x: { provider: "anthropic", model: "claude-3-5-sonnet-latest" },
  linkedin: { provider: "openai", model: "gpt-4.1-mini" },
  threads: { provider: "openai", model: "gpt-4.1-mini" },
  reddit: { provider: "openai", model: "gpt-4.1-mini" },
};

export const platformRules: Record<Platform, string> = {
  twitter: "- Max 280 characters.\n- Punchy, direct.\n- 1-2 relevant hashtags.\n- Optional subtle CTA or question.",
  linkedin: "- Professional tone, value-driven.\n- Share insights or expertise.\n- 1-3 paragraphs.\n- Industry-relevant hashtags.",
  threads: "- Conversational, first-person.\n- Multi-line friendly.\n- Encourage replies.\n- Keep it light.",
  reddit: "- Community-focused, authentic voice.\n- Title should be engaging and clear.\n- Body text can be longer, detailed.\n- Avoid promotional language.\n- Match subreddit culture and norms.",
};
