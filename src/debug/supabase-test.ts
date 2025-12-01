import { supabase } from "@/integrations/supabase/client";

export async function runSupabaseDiagnostics() {
  console.log("🚀 Running OneSNS Supabase Diagnostics...");

  console.log("Env:", {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKeyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  });

  const sessionRes = await supabase.auth.getSession();
  console.log("Session:", sessionRes);

  const userRes = await supabase.auth.getUser();
  console.log("User:", userRes);

  if (!userRes.data?.user) {
    console.warn("⚠️ Not logged in");
    return;
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userRes.data.user.id)
    .single();

  console.log("Profile:", profile, profileErr);

  console.log("🎉 Diagnostics complete.");
}
