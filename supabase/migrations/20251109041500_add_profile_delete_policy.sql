-- Allow users to delete their own profile data to satisfy GDPR/CCPA requirements
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
