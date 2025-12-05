-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table to store OAuth tokens for each social media platform
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('reddit', 'threads', 'instagram', 'twitter', 'pinterest')),
  account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own social accounts
CREATE POLICY "Users can view their own social accounts"
ON public.social_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own social accounts
CREATE POLICY "Users can insert their own social accounts"
ON public.social_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own social accounts
CREATE POLICY "Users can update their own social accounts"
ON public.social_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own social accounts
CREATE POLICY "Users can delete their own social accounts"
ON public.social_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);

-- Trigger for updated_at
CREATE TRIGGER update_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();