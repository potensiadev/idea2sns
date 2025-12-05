import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformSelector } from '@/components/PlatformSelector';
import { useAppStore, DEFAULT_LIMITS, LimitsConfig } from '@/store/useAppStore';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}));

const setProfileResponse = (profile: { plan?: string | null; limits?: Partial<LimitsConfig> | null } | null) => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profile, error: null }),
          }),
        }),
      };
    }

    if (table === 'usage_events') {
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({ count: 0, error: null }),
          }),
        }),
      };
    }

    return {
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    };
  });
};

const renderSelectorWithState = (maxPlatforms: number | null) => {
  const Wrapper = () => {
    const [selected, setSelected] = React.useState<string[]>([]);
    return <PlatformSelector selected={selected} onChange={setSelected} maxPlatforms={maxPlatforms} />;
  };

  render(<Wrapper />);
};

describe('Plan gating', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    useAppStore.setState((state) => ({
      ...state,
      user: null,
      plan: 'free',
      limits: DEFAULT_LIMITS,
      dailyUsed: 0,
      loading: false,
    }));
  });

  it('allows pro users to select all three platforms', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'pro-user' } } });
    setProfileResponse({
      plan: 'pro',
      limits: {
        daily_generations: null,
        max_platforms_per_request: 3,
        blog_to_sns: true,
        max_blog_length: null,
        priority_routing: true,
      },
    });

    await useAppStore.getState().loadProfileAndLimits();

    expect(useAppStore.getState().plan).toBe('pro');
    expect(useAppStore.getState().maxPlatforms).toBe(3);

    renderSelectorWithState(useAppStore.getState().maxPlatforms);

    ['Twitter (X)', 'LinkedIn', 'Threads'].forEach((label) => {
      fireEvent.click(screen.getByText(label));
    });

    expect(screen.getByText('3/3 selected')).toBeTruthy();
    expect(screen.getByText('Threads').closest('button')?.disabled).toBeFalsy();
  });

  it('blocks free users from exceeding one platform', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'free-user' } } });
    setProfileResponse({
      plan: 'free',
      limits: {
        ...DEFAULT_LIMITS,
        max_platforms_per_request: 1,
      },
    });

    await useAppStore.getState().loadProfileAndLimits();

    expect(useAppStore.getState().plan).toBe('free');
    expect(useAppStore.getState().maxPlatforms).toBe(1);

    renderSelectorWithState(useAppStore.getState().maxPlatforms);

    fireEvent.click(screen.getByText('Twitter (X)'));
    fireEvent.click(screen.getByText('LinkedIn'));

    expect(screen.getByText('1/3 selected')).toBeTruthy();
    expect((screen.getByText('LinkedIn').closest('button') as HTMLButtonElement)?.disabled).toBe(true);
  });
});
