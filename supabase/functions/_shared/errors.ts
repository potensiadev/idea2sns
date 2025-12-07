import { buildCorsHeaders } from "./cors.ts";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_ERROR"
  | "INTERNAL_ERROR";

const defaultCorsHeaders = buildCorsHeaders();

export function jsonError(
  code: ErrorCode,
  message: string,
  status = 400,
  details?: unknown,
  corsHeaders: HeadersInit = defaultCorsHeaders,
) {
  return new Response(
    JSON.stringify({
      status: "error",
      error: { code, message, details },
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export function jsonOk(data: unknown, corsHeaders: HeadersInit = defaultCorsHeaders) {
  return new Response(JSON.stringify({ status: "ok", data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
