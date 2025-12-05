// Production and local development origins
const allowedOrigins = [
  "https://idea2sns.space",
  "http://localhost:8080",
  "http://localhost:5173",
];

// Using wildcard for now; can switch to origin-based logic later
const fallbackOrigin = "*";

export const corsHeaders = {
  "Access-Control-Allow-Origin": fallbackOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Helper function for future origin-based CORS
export function buildCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : fallbackOrigin;

  return { ...corsHeaders, "Access-Control-Allow-Origin": allowOrigin };
}
