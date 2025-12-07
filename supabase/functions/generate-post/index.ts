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
 * OpenAI direct call
 * --------------------------------------------------- */
async function callOpenAI(prompt: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content:
            "You are an SNS post generator. Return STRICT JSON with only the required fields.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/* -----------------------------------------------------
 * JSON repair (AI가 코드블록 붙일 때 대비)
 * --------------------------------------------------- */
function fixJson(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) t = t.replace(/```json|```/g, "").trim();
  const idx = t.indexOf("{");
  return idx > 0 ? t.slice(idx) : t;
}

/* -----------------------------------------------------
 * /generate-post handler
 * --------------------------------------------------- */
async function handleRequest(req: Request) {
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
        if (!val.topic?.trim() && !val.content?.trim()) {
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

  // Supabase client
  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseClient(req);
  } catch {
    return jsonError("INTERNAL_ERROR", "Server configuration error", 500, undefined, corsHeaders);
  }

  // Auth
  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    return jsonError("AUTH_REQUIRED", "Authentication required", 401, undefined, corsHeaders);
  }

  // Validate JSON
  let payload: RequestShape;
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return jsonError("VALIDATION_ERROR", "Invalid request body", 400, result.error.format(), corsHeaders);
    }
    payload = result.data as RequestShape;
  } catch {
    return jsonError("VALIDATION_ERROR", "Malformed JSON body", 400, undefined, corsHeaders);
  }

  // usageGuard
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

  /* -----------------------------------------------------
   * AI generation (OpenAI direct)
   * --------------------------------------------------- */
  const posts: Record<Platform, string> = {} as Record<Platform, string>;

  for (const platform of payload.platforms) {
    const rules = { [platform]: platformRules[platform] };

    const singleReq: RequestShape =
      payload.type === "simple"
        ? { ...payload, content: payload.content ?? "", topic: payload.topic ?? "", platforms: [platform] }
        : { type: "blog", blogContent: payload.blogContent, platforms: [platform] };

    const prompt = promptBuilder({ request: singleReq, platformRules: rules });

    let raw = await callOpenAI(prompt);
    raw = fixJson(raw);

    let parsed = {};
    try {
      parsed = JSON.parse(raw);
      if (!parsed[platform]) throw new Error("Missing content");
      posts[platform] = parsed[platform];
    } catch (e) {
      return jsonError(
        "PROVIDER_ERROR",
        `Failed to parse AI response: ${e}`,
        502,
        raw,
        corsHeaders
      );
    }
  }

  /* -----------------------------------------------------
   * Save to Supabase generations
   * --------------------------------------------------- */
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

  const { data, error } = await supabase
    .from("generations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !data) {
    return jsonError("INTERNAL_ERROR", "Failed to save generation", 500, error, corsHeaders);
  }

  return jsonOk({ generation_id: data.id, posts }, corsHeaders);
}

/* -----------------------------------------------------
 * Entrypoint
 * --------------------------------------------------- */
async function respondWithCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  const body = await response.text();
  return new Response(body, { status: response.status || 200, headers });
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
