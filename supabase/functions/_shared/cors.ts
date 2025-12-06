// Production and local development origins
const allowedOrigins = [
  "https://idea2sns.space",
  "https://www.idea2sns.space",
  "https://idea2sns.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const fallbackOrigin = allowedOrigins[0];

export function buildCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export const corsHeaders = buildCorsHeaders();
export { allowedOrigins };
