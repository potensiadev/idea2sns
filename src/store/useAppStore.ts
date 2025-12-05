import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type Plan = 'free' | 'pro';

export interface LimitsConfig {
  daily_generations: number | null;
  max_platforms_per_request: number | null;
  blog_to_sns: boolean;
  max_blog_length: number | null;
  priority_routing: boolean;
}

interface AppState {
  user: any | null;
  plan: Plan;
  limits: LimitsConfig;
  dailyUsed: number;
  loading: boolean;

  // Computed getters
  maxPlatforms: number | null;
  maxBlogLength: number | null;

  // Actions
  setUser: (user: any) => void;
  loadProfileAndLimits: () => Promise<void>;
  loadDailyUsage: () => Promise<void>;
  refreshAfterBilling: () => Promise<void>;
  reset: () => void;
}

export const DEFAULT_LIMITS: LimitsConfig = {
  daily_generations: 5,
  max_platforms_per_request: 3,
  blog_to_sns: true,
  max_blog_length: 2000,
  priority_routing: false,
};

export const PRO_LIMITS: LimitsConfig = {
  daily_generations: null,
  max_platforms_per_request: 3,
  blog_to_sns: true,
  max_blog_length: null,
  priority_routing: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  plan: 'free',
  limits: DEFAULT_LIMITS,
  dailyUsed: 0,
  loading: true,

  // Computed getters
  get maxPlatforms() {
    return get().limits.max_platforms_per_request;
  },
  get maxBlogLength() {
    return get().limits.max_blog_length;
  },

  setUser: (user) => set({ user }),
  
  loadProfileAndLimits: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan, limits')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading profile:', error);
        set({ loading: false });
        return;
      }
      
      const plan = (profile?.plan as Plan) || 'free';
      const limitOverrides = (profile?.limits as Partial<LimitsConfig> | null | undefined) ?? undefined;
      const baseLimits = plan === 'pro' ? PRO_LIMITS : DEFAULT_LIMITS;
      const limits = { ...baseLimits, ...limitOverrides };

      set({
        user,
        plan,
        limits,
        loading: false,
      });
    } catch (error) {
      console.error('Error in loadProfileAndLimits:', error);
      set({ loading: false });
    }
  },
  
  loadDailyUsage: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // Use rpc or direct query - usage_events table will be created by edge functions
      const { count, error } = await supabase
        .from('usage_events' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());
      
      if (error) {
        // Table might not exist yet, that's ok
        console.log('Usage events table not ready yet:', error.message);
        set({ dailyUsed: 0 });
        return;
      }
      
      set({ dailyUsed: count || 0 });
    } catch (error) {
      console.error('Error in loadDailyUsage:', error);
      set({ dailyUsed: 0 });
    }
  },
  
  refreshAfterBilling: async () => {
    await get().loadProfileAndLimits();
    await get().loadDailyUsage();
  },
  
  reset: () => {
    set({
      user: null,
      plan: 'free',
      limits: DEFAULT_LIMITS,
      dailyUsed: 0,
      loading: false,
    });
  },
}));
