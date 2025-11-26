export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "WEBHOOK_INVALID_SIGNATURE"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonError(code: ErrorCode, message: string, status = 400, details?: unknown) {
  return new Response(
    JSON.stringify({
      status: "error",
      error: { code, message, details },
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export function jsonOk(data: unknown) {
  return new Response(JSON.stringify({ status: "ok", data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
