import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureFreshSession } from '@/integrations/supabase/auth-utils';

/**
 * AuthProvider component that manages global authentication state and token refresh.
 * This component:
 * - Automatically refreshes sessions on mount
 * - Listens for auth state changes
 * - Ensures tokens are refreshed before they expire
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Attempt to refresh session on app load
    const initializeAuth = async () => {
      try {
        await ensureFreshSession();
        console.log('Session initialized and refreshed');
      } catch (error) {
        // If refresh fails, user will be prompted to log in when they try to use protected features
        console.log('No active session on app load');
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      // When user signs in, ensure we have a fresh token
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in or token refreshed');
      }

      // When token expires, the user will be prompted to re-authenticate on their next action
      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });

    // Set up periodic token refresh check (every 4 minutes)
    // This ensures we proactively refresh tokens before they expire
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // ensureFreshSession will only refresh if needed (within 5 min of expiry)
          await ensureFreshSession();
        }
      } catch (error) {
        console.error('Background token refresh check failed:', error);
      }
    }, 4 * 60 * 1000); // 4 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  return <>{children}</>;
};
