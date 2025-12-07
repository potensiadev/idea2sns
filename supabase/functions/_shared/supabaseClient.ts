import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function createSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment configuration");
  }

  // Forward only the Authorization header, not all headers
  // (forwarding Host, Content-Length, etc. breaks Supabase internal requests)
  const authHeader = req.headers.get("Authorization");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
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

export async function getAuthenticatedUser(supabase: SupabaseClient, req?: Request) {
  // Extract JWT from Authorization header if request is provided
  if (req) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data, error } = await supabase.auth.getUser(jwt);

      console.log("getUser (with JWT) result - error:", error?.message ?? "none", "user:", data?.user?.id ?? "null");

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
  }

  // Fallback: try without explicit JWT (for backwards compatibility)
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
