import { useEffect } from "react";
import { runSupabaseDiagnostics } from "@/debug/supabase-test";

export default function Debug() {
  useEffect(() => {
    runSupabaseDiagnostics();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Supabase Diagnostics</h1>
      <p className="text-muted-foreground">All diagnostic logs are printed in DevTools Console.</p>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p>This test will verify:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Environment Variables</li>
          <li>Auth Session</li>
          <li>User</li>
          <li>Profiles RLS</li>
          <li>Brand Voices</li>
          <li>Usage Events</li>
          <li>CORS Access for ALL Edge Functions</li>
        </ul>
      </div>

      <p className="text-green-600 font-medium">Please open DevTools → Console to view output.</p>
    </div>
  );
}
