import { supabase } from "@/integrations/supabase/client";

/**
 * OneSNS.ai Supabase Diagnostics
 * - Checks env (URL, anon key)
 * - Validates session + user
 * - Reads profiles table with RLS applied
 * - Reads subscriptions, brand_voices, usage_events
 * - Optional: Calls sample edge function
 */
export async function runSupabaseDiagnostics() {
  console.group("🔍 OneSNS.ai Supabase Diagnostics");

  try {
    // ---------------------------------------------------------
    // ENV CHECK
    // ---------------------------------------------------------
    console.group("🌐 Environment Variables");

    const url = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log("VITE_SUPABASE_URL:", url);
    console.log("VITE_SUPABASE_ANON_KEY present:", !!anon);

    if (!url || !anon) {
      console.warn("❌ Missing Supabase env variables");
    }

    console.groupEnd();

    // ---------------------------------------------------------
    // AUTH SESSION CHECK
    // ---------------------------------------------------------
    console.group("🔐 Auth Session");

    const sessionRes = await supabase.auth.getSession();
    console.log("session.getSession():", sessionRes);

    const userRes = await supabase.auth.getUser();
    console.log("auth.getUser():", userRes);

    if (userRes.error) console.error("⚠️ getUser() Error:", userRes.error);

    if (!userRes.data?.user) {
      console.warn("⚠️ Not logged in — RLS reads will fail.");
      console.groupEnd();
      console.groupEnd();
      return;
    }

    const user = userRes.data.user;

    console.groupEnd(); // END AUTH

    // ---------------------------------------------------------
    // PROFILES TABLE CHECK
    // ---------------------------------------------------------
    console.group("📄 Profiles Table (RLS Test)");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id) // FIXED: correct PK
      .single();

    console.log("profiles.select:", { profile, profileErr });

    if (profileErr) console.error("❌ profiles RLS error:", profileErr);

    console.groupEnd();

    // ---------------------------------------------------------
    // SUBSCRIPTIONS TABLE CHECK
    // ---------------------------------------------------------
    console.group("💳 Subscriptions Table");

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("subscriptions:", { sub, subErr });
    if (subErr) console.error("❌ subscription RLS error:", subErr);

    console.groupEnd();

    // ---------------------------------------------------------
    // BRAND VOICES TABLE CHECK
    // ---------------------------------------------------------
    console.group("🎤 Brand Voices");

    const { data: voices, error: voicesErr } = await supabase.from("brand_voices").select("*").eq("user_id", user.id);

    console.log("brand_voices:", { voices, voicesErr });

    if (voicesErr) console.error("❌ brand_voices RLS error:", voicesErr);

    console.groupEnd();

    // ---------------------------------------------------------
    // USAGE EVENTS TABLE CHECK
    // ---------------------------------------------------------
    console.group("📊 Usage Events");

    const { data: usage, error: usageErr } = await supabase
      .from("usage_events")
      .select("*")
      .eq("user_id", user.id)
      .limit(5);

    console.log("usage_events:", { usage, usageErr });

    if (usageErr) console.error("❌ usage_events RLS error:", usageErr);

    console.groupEnd();

    // ---------------------------------------------------------
    // OPTIONAL — EDGE FUNCTION CHECK
    // (only if deployed)
    // ---------------------------------------------------------
    console.group("⚙️ Edge Function Test (Optional)");

    try {
      const edgeRes = await fetch(`${url}/functions/v1/hello`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anon}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ping: true }),
      });

      console.log("Edge response status:", edgeRes.status);
      const edgeJson = await edgeRes.json().catch(() => null);
      console.log("Edge response JSON:", edgeJson);
    } catch (edgeErr) {
      console.error("⚠️ Edge function error:", edgeErr);
    }

    console.groupEnd();

    // ---------------------------------------------------------
    console.log("🎉 Diagnostics complete.");
  } catch (err) {
    console.error("❌ Diagnostics failed:", err);
  }

  console.groupEnd();
}
