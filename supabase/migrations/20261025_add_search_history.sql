-- ==============================================================================
-- EMBER MUSIC — ADD SEARCH HISTORY TABLE & POLICIES
-- Saves user search queries securely to Supabase PostgreSQL with RLS.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_search_query UNIQUE (user_id, query)
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_time ON public.search_history (user_id, searched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own search history" ON public.search_history;
CREATE POLICY "Users can read own search history"
  ON public.search_history FOR SELECT
  USING (auth.firebase_uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own search history" ON public.search_history;
CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.firebase_uid() = user_id);

DROP POLICY IF EXISTS "Users can update own search history" ON public.search_history;
CREATE POLICY "Users can update own search history"
  ON public.search_history FOR UPDATE
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE
  USING (auth.firebase_uid() = user_id);
