-- Supabase Schema for Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  dob DATE,
  photos TEXT[], -- Array of storage URLs
  height TEXT,
  location TEXT,
  hometown TEXT,
  ethnicity TEXT,
  job_title TEXT,
  children TEXT, -- Radio
  zodiac_sign TEXT,
  politics TEXT,
  pets TEXT[], -- Checkboxes
  drinking TEXT,
  smoking TEXT,
  marijuana TEXT,
  drugs TEXT,
  gender_identity TEXT,
  pronouns TEXT[], -- Checkboxes
  gender_expression TEXT,
  sexual_identity TEXT,
  connection_goals TEXT[], -- Checkboxes
  relationship_style TEXT[], -- Checkboxes
  sex_preferences TEXT[], -- Checkboxes
  kinks TEXT[], -- Checkboxes
  bio TEXT,
  conversation_starter TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  visibility_settings JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to replace them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Optimized RLS Policies using (select auth.uid()) for better performance
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK ((select auth.uid()) = id);
