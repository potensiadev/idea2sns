// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

import { jsonError, jsonOk } from "../_shared/errors.ts";
import { promptBuilder, RequestShape } from "../_shared/promptBuilder.ts";
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

export const config = { runtime: "edge" };
export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://idea2sns.space",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* -----------------------------------------------------
 * Zod schema MUST NOT BE TOP-LEVEL (breaks OPTIONS)
 * --------------------------------------------------- */
// ❌ remove top-level requestSchema


/* -----------------------------------------------------
 * AI Output Parsing
 * --------------------------------------------------- */
function parsePosts(raw: string, requestedPlatforms: Platform[]) {
  try {
    const parsed = JSON.parse(raw);
    const result: Record<Platform, string> = {} as Record<Platform, string>;

    for (const platform of requestedPlatforms) {
      if (!parsed?.[platform] || typeof parsed[platform] !== "string") {
        throw new Error(`Missing content for ${platform}`);
      }
      result[platform] = parsed[platform].trim();
    }
    return result;
  } catch (error) {
    throw new Error(`Failed to parse AI output as JSON: ${error}`);
  }
}

/* -----------------------------------------------------
 * JSON Repair
 * --------------------------------------------------- */
function tryJsonRepair(text: string): string {
  let fixed = text.trim();
  if (fixed.startsWith("```")) {
    fixed = fixed.replace(/```json/i, "").replace(/```/g, "").trim();
  }
  const firstBrace = fixed.indexOf("{");
  if (firstBrace > 0) fixed = fixed.slice(firstBrace);
  return fixed;
}

/* -----------------------------------------------------
 * Provider helpers...
 * (동일하므로 생략 없이 유지)
 * --------------------------------------------------- */
// callOpenAI(), callAnthropic(), withRetry(), generateWithFallback()


/* -----------------------------------------------------
 * Handler (Zod schema moved inside)
 * --------------------------------------------------- */
async function handleRequest(req: Request) {
  // ⭐ Zod schema 정의는 반드시 여기에서!
  const requestSchema = z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("simple"),
        topic: z.string().max(200).optional(),
        content: z.string().max(3000).optional(),
        tone: z.string().min(1),
        platforms: z.array(platformEnum).min(1).max(3),
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
      }),

    z.object({
      type: z.literal("blog"),
      blogContent: z.string().min(1),
      platforms: z.array(platformEnum).min(1).max(3),
    }),
  ]);

  // ------- Supabase client -------
  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseClient(req);
  } catch (error) {
    return jsonError("INTERNAL_ERROR", "Server configuration error", 500, undefined, corsHeaders);
  }

  // ------- Auth -------
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return jsonError("AUTH_REQUIRED", "Authentication required", 401, undefined, corsHeaders);
  }

  // ------- Body validation -------
  let payload: RequestShape;
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return jsonError("VALIDATION_ERROR", "Invalid request body", 400, result.error.format(), corsHeaders);
    }
    payload = result.data as RequestShape;
  } catch (_err) {
    return jsonError("VALIDATION_ERROR", "Malformed JSON body", 400, undefined, corsHeaders);
  }

  // ------- Usage guard -------
  try {
    await usageGuard(
      supabase,
      user.id,
      payload.type === "blog" ? "blog_to_sns" : "generate_post",
      {
        platformCount: payload.platforms.length,
        blogLength:
          payload.type === "blog"
            ? payload.blogContent.length
            : (payload.content ?? "").length,
      },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError("INTERNAL_ERROR", "Failed to enforce usage limits", 500, undefined, corsHeaders);
  }

  // ------- AI generation (기존과 동일) -------
  const posts: Record<Platform, string> = {} as Record<Platform, string>;

  for (const platform of payload.platforms) {
    const rulesForOne = { [platform]: platformRules[platform] } as Record<
      Platform,
      string
    >;

    const singleRequest: RequestShape =
      payload.type === "simple"
        ? {
            ...payload,
            content: payload.content ?? "",
            topic: payload.topic ?? "",
            platforms: [platform],
          }
        : {
            type: "blog",
            blogContent: payload.blogContent,
            platforms: [platform],
          };

    const prompt = promptBuilder({
      request: singleRequest,
      platformRules: rulesForOne,
    });

    let aiContent: string;
    try {
      aiContent = await generateWithFallback(prompt);
    } catch (err) {
      return jsonError(
        "PROVIDER_ERROR",
        "All AI providers failed",
        502,
        err instanceof Error ? err.message : String(err),
        corsHeaders,
      );
    }

    try {
      const parsed = parsePosts(aiContent, [platform]);
      posts[platform] = parsed[platform]!;
    } catch (err) {
      return jsonError(
        "PROVIDER_ERROR",
        "AI response could not be parsed",
        502,
        err instanceof Error ? err.message : String(err),
        corsHeaders,
      );
    }
  }

  // ------- Save to DB -------
  const insertPayload = {
    user_id: user.id,
    source: payload.type === "simple" ? "idea" : "blog",
    topic: payload.type === "simple" ? payload.topic : null,
    content:
      payload.type === "simple" ? payload.content : payload.blogContent,
    tone: payload.type === "simple" ? payload.tone : null,
    platforms: payload.platforms,
    outputs: posts,
    variant_type: "original",
    parent_generation_id: null,
  };

  const { data: generationInsert, error: generationError } =
    await supabase.from("generations").insert(insertPayload).select("id").single();

  if (!generationInsert || generationError) {
    return jsonError(
      "INTERNAL_ERROR",
      "Failed to save generation",
      500,
      undefined,
      corsHeaders,
    );
  }

  return jsonOk({ generation_id: generationInsert.id, posts }, corsHeaders);
}

/* -----------------------------------------------------
 * Response wrapper
 * --------------------------------------------------- */
async function respondWithCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  const body = await response.text();
  return new Response(body, {
    status: response.status || 200,
    headers,
  });
}

/* -----------------------------------------------------
 * ENTRYPOINT (OPTIONS handled before handler)
 * --------------------------------------------------- */
export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const resp = await handleRequest(req);
    if (resp instanceof Response) return respondWithCors(resp);
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
