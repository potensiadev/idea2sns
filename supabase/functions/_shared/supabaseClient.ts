import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function createSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment configuration");
  }

  // ⭐ 핵심 수정: Authorization 포함 전체 헤더를 전달
  const forwardedHeaders = Object.fromEntries(req.headers);

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: forwardedHeaders,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createServiceSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase service environment configuration");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  // First try getUser() which validates the token with the auth server
  const { data, error } = await supabase.auth.getUser();

  console.log("getUser result - error:", error?.message ?? "none", "user:", data?.user?.id ?? "null");

  if (error) {
    console.error("getUser error details:", JSON.stringify(error));
    return null;
  }

  if (!data?.user) {
    console.error("getUser returned no user despite no error");
    return null;
  }
  return data.user;
}
