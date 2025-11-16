import { supabase } from './client';
import type { Session } from '@supabase/supabase-js';

/**
 * Time in seconds before token expiry to trigger a refresh (5 minutes)
 */
const REFRESH_THRESHOLD_SECONDS = 5 * 60;

/**
 * Checks if a session's access token is expired or about to expire
 */
function isTokenExpiringSoon(session: Session | null): boolean {
  if (!session?.expires_at) {
    return true;
  }

  const expiresAt = session.expires_at * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  return timeUntilExpiry < REFRESH_THRESHOLD_SECONDS * 1000;
}

/**
 * Ensures the current session has a valid, non-expiring access token.
 * Automatically refreshes the session if the token is expired or about to expire.
 *
 * @returns A valid session or null if refresh fails
 * @throws Error if user needs to re-authenticate
 */
export async function ensureFreshSession(): Promise<Session | null> {
  // First, get the current session from storage
  const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Error getting session:', sessionError);
    throw new Error('AUTH_SESSION_ERROR');
  }

  // No session exists - user needs to log in
  if (!currentSession) {
    throw new Error('AUTH_REQUIRED');
  }

  // If token is still valid and not expiring soon, return current session
  if (!isTokenExpiringSoon(currentSession)) {
    return currentSession;
  }

  // Token is expired or expiring soon - attempt refresh
  console.log('Access token expiring soon, refreshing session...');

  const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    console.error('Session refresh failed:', refreshError);

    // If refresh fails, the refresh token might be expired/invalid
    // User needs to re-authenticate
    throw new Error('AUTH_REFRESH_FAILED');
  }

  if (!refreshedSession) {
    throw new Error('AUTH_REFRESH_FAILED');
  }

  console.log('Session refreshed successfully');
  return refreshedSession;
}

/**
 * Gets a fresh access token for use in API calls.
 * Automatically refreshes if needed.
 *
 * @returns A valid access token
 * @throws Error if unable to get or refresh the token
 */
export async function getFreshAccessToken(): Promise<string> {
  const session = await ensureFreshSession();

  if (!session?.access_token) {
    throw new Error('AUTH_NO_ACCESS_TOKEN');
  }

  return session.access_token;
}

/**
 * Error codes that can be thrown by auth utilities
 */
export const AUTH_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_SESSION_ERROR: 'AUTH_SESSION_ERROR',
  AUTH_REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
  AUTH_NO_ACCESS_TOKEN: 'AUTH_NO_ACCESS_TOKEN',
} as const;

/**
 * Type guard to check if an error is an auth-related error
 */
export function isAuthError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    Object.values(AUTH_ERROR_CODES).includes(error.message as any)
  );
}
