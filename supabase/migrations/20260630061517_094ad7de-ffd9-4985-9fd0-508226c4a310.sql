
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Emergency contacts
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_contacts TO authenticated;
GRANT ALL ON public.emergency_contacts TO service_role;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SOS events
CREATE TABLE public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  trigger_type TEXT NOT NULL,
  transcript TEXT,
  confidence NUMERIC,
  location_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_events TO authenticated;
GRANT ALL ON public.sos_events TO service_role;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sos" ON public.sos_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Voice detections
CREATE TABLE public.voice_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_detections TO authenticated;
GRANT ALL ON public.voice_detections TO service_role;
ALTER TABLE public.voice_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voice" ON public.voice_detections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Text detections
CREATE TABLE public.text_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_detections TO authenticated;
GRANT ALL ON public.text_detections TO service_role;
ALTER TABLE public.text_detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own text" ON public.text_detections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Route history
CREATE TABLE public.route_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  chosen_route_label TEXT,
  safety_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_history TO authenticated;
GRANT ALL ON public.route_history TO service_role;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routes" ON public.route_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User settings
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
  language TEXT NOT NULL DEFAULT 'en',
  voice_sensitivity NUMERIC NOT NULL DEFAULT 0.8,
  shake_sos BOOLEAN NOT NULL DEFAULT TRUE,
  auto_guardian BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
