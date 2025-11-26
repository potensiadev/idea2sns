import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export type Platform = "reddit" | "threads" | "instagram" | "twitter" | "pinterest";

export const allowedPlatforms: Platform[] = ["reddit", "threads", "instagram", "twitter", "pinterest"];

export const platformEnum = z.enum(allowedPlatforms);

export const platformRules: Record<Platform, string> = {
  twitter: "- Max 280 characters.\n- Punchy, direct.\n- 1-2 relevant hashtags.\n- Optional subtle CTA or question.",
  instagram:
    "- Hook in first line.\n- Conversational and visual.\n- 3-5 relevant hashtags at end.\n- Use line breaks for readability.",
  reddit:
    "- Story-driven, authentic, non-promotional.\n- Encourage discussion.\n- Respect subreddit norms.\n- Clear takeaway.",
  threads: "- Conversational, first-person.\n- Multi-line friendly.\n- Encourage replies.\n- Keep it light.",
  pinterest: "- Keyword-rich, action oriented.\n- Inspire saving/clicking.\n- 2-4 hashtags.\n- 500 characters max.",
};
