// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

import { jsonError, jsonOk } from "../_shared/errors.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { BrandVoice, promptBuilder, RequestShape } from "../_shared/promptBuilder.ts";
import {
  createSupabaseClient,
  getAuthenticatedUser,
} from "../_shared/supabaseClient.ts";
import {
  platformEnum,
  platformRules,
  type Platform,
} from "../_shared/platformRules.ts";
import { usageGuard } from "../_shared/usageGuard.ts";

/* -----------------------------------------------------
 * Request Schema
 * --------------------------------------------------- */
const requestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("simple"),
    topic: z.string().min(1),
    content: z.string().min(1),
    tone: z.string().min(1),
    platforms: z.array(platformEnum).min(1),
    brandVoiceId: z.string().uuid().nullable().optional(),
  }),
  z.object({
    type: z.literal("blog"),
    blogContent: z.string().min(1),
    platforms: z.array(platformEnum).min(1),
    brandVoiceId: z.string().uuid().nullable().optional(),
  }),
]);

/* -----------------------------------------------------
 * Brand Voice Loader
 * --------------------------------------------------- */
async function resolveBrandVoice(
  supabase: SupabaseClient,
  userId: string,
  brandVoiceId?: string | null,
): Promise<BrandVoice> {
  if (!brandVoiceId) return null;

  const { data, error } = await supabase
    .from("brand_voices")
    .select("extracted_style,label")
    .eq("id", brandVoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load brand voice: ${error.message}`);
  }

  return data ?? null;
}

/* -----------------------------------------------------
 * AI Output Parsing (Platform JSON)
 * --------------------------------------------------- */
function parsePosts(raw: string, requestedPlatforms: Platform[]) {
  try {
    const parsed = JSON.parse(raw);
    const result: Record<Platform, string> = {} as Record<Platform, string>;

    for (const platform of requestedPlatforms) {
      if (
        typeof parsed?.[platform] !== "string" ||
        !parsed[platform].trim()
      ) {
        throw new Error(`Missing content for ${platform}`);
      }
      result[platform] = parsed[platform].trim();
    }
    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse AI output as JSON: ${
        error instanceof Error ? error.message : String(error)
      } | Raw: ${raw}`,
    );
  }
}

/* -----------------------------------------------------
 * AI Providers (OpenAI → Anthropic fallback)
 * --------------------------------------------------- */

// JSON Repair: AI가 잘못된 JSON을 반환한 경우 대비
function tryJsonRepair(text: string): string {
  // 1) trim
  let fixed = text.trim();

  // 2) 백틱 제거
  if (fixed.startsWith("```")) {
    fixed = fixed.replace(/```json/i, "").replace(/```/g, "").trim();
  }

  // 3) 문자열이 JSON 객체로 시작하지 않을 시 보정
  const firstBrace = fixed.indexOf("{");
  if (firstBrace > 0) {
    fixed = fixed.slice(firstBrace);
  }

  return fixed;
}

type Provider = "openai" | "anthropic";

type ProviderSuccess = { ok: true; provider: Provider; content: string };
type ProviderError = { ok: false; provider: Provider; status: number; error: string };
type ProviderResult = ProviderSuccess | ProviderError;

async function callOpenAI(promptText: string): Promise<ProviderResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) {
    return { ok: false, provider: "openai", status: 0, error: "Missing OPENAI_API_KEY" };
  }

  try {
    const res = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          max_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an SNS post generator. Always return STRICT JSON ONLY. No markdown.",
            },
            { role: "user", content: promptText },
          ],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      const error = body.slice(0, 500);
      console.error(`[OpenAI Error] status=${res.status} body=${error}`);
      return { ok: false, provider: "openai", status: res.status, error };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || null;

    if (!content) {
      return { ok: false, provider: "openai", status: res.status, error: "Empty response content" };
    }

    return { ok: true, provider: "openai", content: tryJsonRepair(content) };
  } catch (err) {
    const error = String(err);
    console.error("[OpenAI Exception]", error);
    return { ok: false, provider: "openai", status: 0, error };
  }
}

async function callAnthropic(promptText: string): Promise<ProviderResult> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return { ok: false, provider: "anthropic", status: 0, error: "Missing ANTHROPIC_API_KEY" };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: [
              { type: "text", text: "Always respond with a strict JSON object only, no markdown." },
            ],
          },
          { role: "user", content: [{ type: "text", text: promptText }] },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      const error = body.slice(0, 500);
      console.error(`[Anthropic Error] status=${res.status} body=${error}`);
      return { ok: false, provider: "anthropic", status: res.status, error };
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text || null;

    if (!content) {
      return { ok: false, provider: "anthropic", status: res.status, error: "Empty response content" };
    }

    return { ok: true, provider: "anthropic", content: tryJsonRepair(content) };
  } catch (err) {
    const error = String(err);
    console.error("[Anthropic Exception]", error);
    return { ok: false, provider: "anthropic", status: 0, error };
  }
}

async function withRetry(
  provider: Provider,
  fn: () => Promise<ProviderResult>,
  attempts = 2,
): Promise<ProviderResult> {
  let lastResult: ProviderResult | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await fn();
    lastResult = result;

    if (result.ok) return result;

    const shouldRetry =
      result.status === 429 || (result.status >= 500 && result.status < 600);

    if (!shouldRetry || attempt === attempts) {
      return result;
    }

    console.warn(`[${provider} Retry] attempt ${attempt} failed with status ${result.status}`);
  }

  return lastResult!;
}

async function generateWithFallback(promptText: string): Promise<string> {
  const openaiResult = await withRetry("openai", () => callOpenAI(promptText));
  if (openaiResult.ok) return openaiResult.content;

  const anthropicResult = await withRetry("anthropic", () => callAnthropic(promptText));
  if (anthropicResult.ok) return anthropicResult.content;

  throw new Error(JSON.stringify({
    openai: { status: openaiResult.status, error: openaiResult.error },
    anthropic: { status: anthropicResult.status, error: anthropicResult.error },
  }));
}

/* -----------------------------------------------------
 * Handler
 * --------------------------------------------------- */
async function handler(req: Request) {
  let supabase: SupabaseClient;

  try {
    supabase = createSupabaseClient(req);
  } catch (error) {
    console.error(error);
    return jsonError("INTERNAL_ERROR", "Server configuration error", 500);
  }

  // -------- AUTH -------- //
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return jsonError("AUTH_REQUIRED", "Authentication required", 401);
  }

  // -------- BODY VALIDATION -------- //
  let payload: RequestShape;
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return jsonError("VALIDATION_ERROR", "Invalid request body", 400, result.error.format());
    }
    payload = result.data as RequestShape;
  } catch (err) {
    return jsonError("VALIDATION_ERROR", "Malformed JSON body", 400);
  }

  // -------- USAGE GUARD -------- //
  try {
    await usageGuard(
      supabase,
      user.id,
      payload.type === "blog" ? "blog_to_sns" : "generate_post",
      {
        platformCount: payload.platforms.length,
        blogLength: payload.type === "blog"
          ? payload.blogContent.length
          : undefined,
        brandVoiceRequested: Boolean(payload.brandVoiceId),
      },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Usage guard error:", err);
    return jsonError("INTERNAL_ERROR", "Failed to enforce usage limits", 500);
  }

  // -------- BRAND VOICE -------- //
  let brandVoice: BrandVoice = null;
  try {
    brandVoice = await resolveBrandVoice(
      supabase,
      user.id,
      payload.brandVoiceId ?? null,
    );
  } catch (err) {
    console.error(err);
    return jsonError("INTERNAL_ERROR", "Failed to load brand voice", 500);
  }

  // -------- AI GENERATION -------- //
  const posts: Record<Platform, string> = {} as Record<Platform, string>;

  for (const platform of payload.platforms) {
    const rulesForOne = {
      [platform]: platformRules[platform],
    } as Record<Platform, string>;

    const singleRequest: RequestShape =
      payload.type === "simple"
        ? { ...payload, platforms: [platform] }
        : {
          type: "blog",
          blogContent: payload.blogContent,
          platforms: [platform],
          brandVoiceId: payload.brandVoiceId ?? null,
        };

    const prompt = promptBuilder({
      request: singleRequest,
      platformRules: rulesForOne,
      brandVoice,
    });

    let aiContent: string;
    try {
      aiContent = await generateWithFallback(prompt);
    } catch (err) {
      console.error("Provider Error:", err);
      return jsonError(
        "PROVIDER_ERROR",
        "All AI providers failed",
        502,
        err instanceof Error ? err.message : String(err),
      );
    }

    try {
      const parsed = parsePosts(aiContent, [platform]);
      posts[platform] = parsed[platform]!;
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return jsonError(
        "PROVIDER_ERROR",
        "AI response could not be parsed",
        502,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // -------- SAVE GENERATION -------- //
  const insertPayload = {
    user_id: user.id,
    source: payload.type === "simple" ? "idea" : "blog",
    topic: payload.type === "simple" ? payload.topic : null,
    content: payload.type === "simple" ? payload.content : payload.blogContent,
    tone: payload.type === "simple" ? payload.tone : null,
    platforms: payload.platforms,
    outputs: posts,
    variant_type: "original",
    parent_generation_id: null,
  };

  const { data: generationInsert, error: generationError } = await supabase
    .from("generations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (generationError || !generationInsert) {
    console.error("Failed to save generation:", generationError);
    return jsonError("INTERNAL_ERROR", "Failed to save generation", 500);
  }

  return jsonOk({
    generation_id: generationInsert.id,
    posts,
  });
}

/* -----------------------------------------------------
 * Server
 * --------------------------------------------------- */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resp = await handler(req);

    if (resp instanceof Response) {
      const text = await resp.text();
      return new Response(text, {
        status: resp.status || 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Edge Error]", err);
    return new Response(
      JSON.stringify({ error: String((err as any)?.message ?? err) }),
      { status: 500, headers: corsHeaders },
    );
  }
});