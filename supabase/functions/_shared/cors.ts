export function buildCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    "https://idea2sns.space",
    "http://localhost:5173",
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}
