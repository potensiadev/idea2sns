import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

import { jsonError, jsonOk } from "../_shared/errors.ts";
import { promptBuilder, type RequestShape } from "../_shared/promptBuilder.ts";
import {
  createSupabaseClient,
  getAuthenticatedUser,
} from "../_shared/supabaseClient.ts";
import { platformEnum, platformRules, type Platform } from "../_shared/platformRules.ts";
import { usageGuard } from "../_shared/usageGuard.ts";

export const config = { runtime: "edge" };
export const runtime = "edge";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://idea2sns.space",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 7000;

function fixJson(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) t = t.replace(/```json|```/g, "").trim();
  const idx = t.indexOf("{");
  return idx >= 0 ? t.slice(idx) : t;
}

async function callOpenAI(prompt: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const body = {
    model: "gpt-4o-mini",
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an SNS post generator. Return strict JSON with one key per platform containing the post text only.",
      },
      { role: "user", content: prompt },
    ],
  };

  const fetchPromise = fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const timeoutPromise = new Promise<Response>((_, reject) => {
    const id = setTimeout(() => reject(new Error("OPENAI_TIMEOUT")), OPENAI_TIMEOUT_MS);
    // Deno timers must be cleared once fetch resolves/rejects.
    fetchPromise.finally(() => clearTimeout(id)).catch(() => clearTimeout(id));
  });

  const res = await Promise.race([fetchPromise, timeoutPromise]);

  if (!(res instanceof Response)) {
    throw new Error("OPENAI_TIMEOUT");
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned empty content");
  }
  return content;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return withCors(new Response("ok"));
  }

  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseClient(req);
  } catch (err) {
    console.error("Supabase client init failed", err);
    return withCors(
      jsonError("INTERNAL_ERROR", "Server configuration error", 500, undefined, corsHeaders),
    );
  }

  const authHeader = req.headers.get("Authorization");
  console.log("Auth header present:", !!authHeader);

  const user = await getAuthenticatedUser(supabase);
  if (!user) {
    console.error("Auth failed - no user found. Auth header:", authHeader?.substring(0, 20) + "...");
    return withCors(jsonError("AUTH_REQUIRED", "Authentication required", 401, undefined, corsHeaders));
  }
  console.log("Authenticated user:", user.id);

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

  let payload: RequestShape;
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return withCors(
        jsonError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.format(), corsHeaders),
      );
    }
    payload = parsed.data as RequestShape;
  } catch (err) {
    console.error("JSON parse error", err);
    return withCors(jsonError("VALIDATION_ERROR", "Malformed JSON body", 400, undefined, corsHeaders));
  }

  try {
    await usageGuard(
      supabase,
      user.id,
      payload.type === "blog" ? "blog_to_sns" : "generate_post",
      {
        platformCount: payload.platforms.length,
        blogLength: payload.type === "blog" ? payload.blogContent.length : (payload.content ?? "").length,
      },
    );
  } catch (err) {
    if (err instanceof Response) return withCors(err);
    console.error("usageGuard failed", err);
    return withCors(jsonError("INTERNAL_ERROR", "Failed to enforce usage limits", 500, undefined, corsHeaders));
  }

  const generationPromises = payload.platforms.map(async (platform) => {
    const singleReq: RequestShape =
      payload.type === "simple"
        ? { ...payload, content: payload.content ?? "", topic: payload.topic ?? "", platforms: [platform] }
        : { type: "blog", blogContent: payload.blogContent, platforms: [platform] };

    const prompt = promptBuilder({ request: singleReq, platformRules: { [platform]: platformRules[platform] } });

    try {
      const raw = await callOpenAI(prompt);
      const parsed = JSON.parse(fixJson(raw));
      const platformContent = parsed?.[platform];
      if (typeof platformContent !== "string" || !platformContent.trim()) {
        throw new Error("Missing platform content");
      }
      return { platform, result: { error: null, content: platformContent } };
    } catch (err) {
      console.error(`Generation failed for ${platform}`, err);
      return { platform, result: { error: "OPENAI_FAILED", content: null } };
    }
  });

  const generated = await Promise.all(generationPromises);
  const outputs: Record<Platform, { error: string | null; content: string | null }> =
    {} as Record<Platform, { error: string | null; content: string | null }>;
  generated.forEach(({ platform, result }) => {
    outputs[platform] = result;
  });

  const insertPayload = {
    user_id: user.id,
    source: payload.type === "simple" ? "idea" : "blog",
    topic: payload.type === "simple" ? payload.topic : null,
    content: payload.type === "simple" ? payload.content : payload.blogContent,
    tone: payload.type === "simple" ? payload.tone : null,
    platforms: payload.platforms,
    outputs,
    variant_type: "original" as const,
    parent_generation_id: null as const,
  };

  const { data, error } = await supabase.from("generations").insert(insertPayload).select("id").single();
  if (error || !data) {
    console.error("Failed to save generation", error);
    return withCors(jsonError("INTERNAL_ERROR", "Failed to save generation", 500, error, corsHeaders));
  }

  return withCors(jsonOk({ generation_id: data.id, outputs }, corsHeaders));
});
