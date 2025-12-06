import { supabase } from '@/integrations/supabase/client';

export interface EdgeFunctionResponse<T = any> {
  data?: T;
  error?: string;
}

export async function callEdgeFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: { headers?: Record<string, string>; requireAuth?: boolean }
): Promise<EdgeFunctionResponse<T>> {
  let headers = options?.headers;

  if (options?.requireAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Authentication required to call edge function');
    }

    headers = {
      ...headers,
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body || {},
    headers,
  });

  if (error) {
    console.error(`Edge function ${functionName} error:`, error);
    throw error;
  }

  return { data };
}

// Typed edge function calls
export const edgeFunctions = {
  generatePost: (body: {
    type: 'simple';
    topic: string;
    content: string;
    tone: string;
    platforms: string[];
    brandVoiceId?: string | null;
  }) =>
    callEdgeFunction('generate-post', body, {
      requireAuth: true,
    }),
  
  generateVariations: (body: {
    baseText: string;
    styles: string[];
    brandVoiceId?: string | null;
  }) => callEdgeFunction('generate-variations', body),
  
  blogToSns: (body: {
    type: 'blog';
    blogContent: string;
    platforms: string[];
    brandVoiceId?: string | null;
  }) =>
    callEdgeFunction('generate-post', body, {
      requireAuth: true,
    }),
  
  extractBrandVoice: (body: {
    samples: string[];
    title?: string;
  }) => callEdgeFunction('brand-voice-extract', body),

  getGenerations: (body: {
    limit?: number;
    offset?: number;
    types?: string[] | null;
    from?: string | null;
    to?: string | null;
  }) => callEdgeFunction('get-generations', body),

  activatePromo: (body: { code: string }) => callEdgeFunction('activate-promo', body),

  adminUpgradeUser: (body: { userId: string; plan: 'pro' | 'free' }) =>
    callEdgeFunction('admin-upgrade-user', body, {
      headers: {
        'x-admin-secret': import.meta.env.VITE_ADMIN_UPGRADE_SECRET || '',
      },
    }),
};
