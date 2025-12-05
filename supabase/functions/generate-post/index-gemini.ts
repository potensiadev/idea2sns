import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { aiRouter } from "../_shared/aiRouter.ts";
import { createSupabaseClient } from "../_shared/supabaseClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const simpleGenerateSchema = z
  .object({
    type: z.literal("simple"),
    topic: z.string().max(200).optional(),
    content: z.string().max(3000).optional(),
    tone: z.string().min(1).max(50),
    platforms: z
      .array(z.enum(["twitter", "linkedin", "threads"]))
      .min(1)
      .max(3),
  })
  .superRefine((val, ctx) => {
    const hasTopic = Boolean(val.topic && val.topic.trim());
    const hasContent = Boolean(val.content && val.content.trim());
    if (!hasTopic && !hasContent) {
      ctx.addIssue({
        code: "custom",
        message: "Either topic or content must be provided",
        path: ["topic"],
      });
    }
  });

const blogGenerateSchema = z.object({
  type: z.literal("blog"),
  blogContent: z.string().min(1).max(10000),
  keyMessage: z.string().max(500).optional(),
  platforms: z
    .array(z.enum(["twitter", "linkedin", "threads"]))
    .min(1)
    .max(3),
});

const generateRequestSchema = z.discriminatedUnion("type", [simpleGenerateSchema, blogGenerateSchema]);

const PLATFORM_PROMPTS = {
  threads: `Write a Threads post that captures a quick, punchy thought inspired by the source content.
Follow these guidelines:
- Keep it extremely short (50–100 characters ideally)
- Use a relaxed, conversational tone that feels spontaneous
- Include a relatable insight or tiny moment of clarity
- You may use 1–2 emojis, but only if they fit naturally
- End with a light engagement nudge, not a CTA
- Style should blend Twitter brevity with Instagram personality
- Avoid repeating any phrasing used in other platform outputs
- Do not use # or ## unless they're actual hashtags (rarely needed here)`,

  instagram: `Write an Instagram caption that reads smoothly and visually like a native IG post.
Follow these guidelines:
- Start with a strong first line that instantly catches attention
- Use a warm, aesthetic, or inspiring tone throughout
- Structure the caption into 3–4 short paragraphs with intentional line breaks
- Place emojis naturally within sentences or at the end of lines (not overused)
-- Finish with 20–30 relevant hashtags mixing both popular and niche keywords
-- Ensure the caption is easy to skim and visually pleasant
-- Do not reuse sentence structures from other platform outputs
-- Do not use # or ## except for hashtags at the end`,

  twitter: `Write a Twitter/X post that delivers one sharp insight from the content.
Follow these guidelines:
- Focus on one clear takeaway or value point
- Use concise, direct, punchy language
- Stay within 280 characters
- You may include 1–2 relevant hashtags used naturally
- Optionally end with a gentle question or light CTA
- Every word should contribute meaning—no filler
- Do not reuse phrasing from any other platform outputs
- Do not use # or ## except for hashtags`,

  linkedin: `Write a LinkedIn post that conveys a practical professional takeaway.
Follow these guidelines:
- Keep it concise (1–3 short paragraphs)
- Use credible, confident language with a helpful tone
- Include 1–3 relevant hashtags if they add clarity
- Invite thoughtful discussion without sounding salesy
- Avoid reusing exact phrases from other platform outputs`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let supabase;
    try {
      supabase = createSupabaseClient(req);
    } catch (error) {
      console.error("Supabase configuration error", error);
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = generateRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return new Response(JSON.stringify({ error: "Invalid request data", details: validationResult.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestData = validationResult.data;
    const platforms = requestData.platforms;

    console.log("Request type:", requestData.type, "Platforms:", platforms);

    const posts: Record<string, string> = {};

    async function callAI(systemPrompt: string, userPrompt: string) {
      try {
        const result = await aiRouter.generate({ systemPrompt, userPrompt });
        return { content: result.text, status: 200 };
      } catch (error) {
        console.error("AI routing error", error);
        return {
          error: error instanceof Error ? error.message : "Unknown AI error",
          status: 502,
        };
      }
    }

    // Branch based on request type
    if (requestData.type === "simple") {
      // Original simple generation logic
      const { topic = "", content = "", tone } = requestData;

      for (const platform of platforms) {
        const prompt = PLATFORM_PROMPTS[platform as keyof typeof PLATFORM_PROMPTS];

        const systemPrompt = `You are an expert social media content creator specializing in ${platform}.
Your task is to create viral-worthy, platform-native content that resonates with the audience.
Tone: ${tone}
Follow the platform-specific guidelines exactly.`;

        const userPrompt = `${prompt}

Topic: ${topic}
Content: ${content}

Generate ONLY the post content. Do not include any meta-commentary, explanations, or labels.`;

        const result = await callAI(systemPrompt, userPrompt);

        if (result.error) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: result.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        posts[platform] = result.content ?? "";
      }
    } else {
      // Blog analysis and conversion logic
      const { blogContent, keyMessage } = requestData;

      console.log("Analyzing blog content (length: " + blogContent.length + " chars)");

      // Step 1: Analyze and summarize the blog
      const analysisSystemPrompt = `You are an expert content analyst and social media strategist.
Your task is to analyze blog content and extract key insights for social media distribution.`;

      const analysisUserPrompt = `Analyze the following blog post and extract:
1. Main topic/theme
2. 3-5 key takeaways or insights
3. Target audience
4. Emotional tone
5. Call-to-action (if any)

${keyMessage ? `The author wants to emphasize: ${keyMessage}\n\n` : ""}

Blog content:
${blogContent}

Provide a structured summary in JSON format:
{
  "mainTopic": "...",
  "keyTakeaways": ["...", "...", "..."],
  "targetAudience": "...",
  "tone": "...",
  "cta": "..."
}`;

      const analysisResult = await callAI(analysisSystemPrompt, analysisUserPrompt);

      if (analysisResult.error) {
        return new Response(JSON.stringify({ error: analysisResult.error }), {
          status: analysisResult.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Blog analysis complete:", analysisResult.content);

      let blogSummary;
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = (analysisResult.content ?? "").trim();
        if (jsonText.includes("```json")) {
          jsonText = jsonText.split("```json")[1].split("```")[0].trim();
        } else if (jsonText.includes("```")) {
          jsonText = jsonText.split("```")[1].split("```")[0].trim();
        }
        blogSummary = JSON.parse(jsonText);
      } catch (e) {
        // If JSON parsing fails, create a simple summary
        console.error("Failed to parse blog analysis, using fallback");
        blogSummary = {
          mainTopic: "Blog content",
          keyTakeaways: [blogContent.substring(0, 200)],
          targetAudience: "General audience",
          tone: "Professional",
          cta: "",
        };
      }

      // Step 2: Generate platform-specific posts based on the summary
      for (const platform of platforms) {
        const platformPrompt = PLATFORM_PROMPTS[platform as keyof typeof PLATFORM_PROMPTS];

        const systemPrompt = `You are an expert social media content creator specializing in ${platform}.
Your task is to transform blog content into viral-worthy, platform-native posts.
Follow the platform-specific guidelines exactly.`;

        const userPrompt = `${platformPrompt}

Based on this blog analysis:
- Main Topic: ${blogSummary.mainTopic}
- Key Takeaways: ${blogSummary.keyTakeaways.join(", ")}
- Target Audience: ${blogSummary.targetAudience}
- Tone: ${blogSummary.tone}
- CTA: ${blogSummary.cta}

${keyMessage ? `IMPORTANT: Make sure to emphasize this key message: ${keyMessage}\n` : ""}

Create a ${platform} post that captures the essence of the blog while being optimized for ${platform}'s unique format and audience.

Generate ONLY the post content. Do not include any meta-commentary, explanations, or labels.`;

        const result = await callAI(systemPrompt, userPrompt);

        if (result.error) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: result.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        posts[platform] = result.content ?? "";
      }
    }

    console.log("Successfully generated posts for all platforms");

    return new Response(JSON.stringify({ posts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in generate-post function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
