-- Add plan and limits columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN plan TEXT DEFAULT 'free',
ADD COLUMN limits JSONB DEFAULT '{"daily_generations": 5, "max_platforms_per_request": 2, "brand_voice": false, "blog_to_sns": true, "max_blog_length": 2000, "variations_per_request": 2, "history_limit": 50, "priority_routing": false}'::jsonb;

-- Add index for plan lookups
CREATE INDEX idx_profiles_plan ON public.profiles(plan);

-- Update existing profiles to have default free plan
UPDATE public.profiles
SET plan = 'free',
    limits = '{"daily_generations": 5, "max_platforms_per_request": 2, "brand_voice": false, "blog_to_sns": true, "max_blog_length": 2000, "variations_per_request": 2, "history_limit": 50, "priority_routing": false}'::jsonb
WHERE plan IS NULL;