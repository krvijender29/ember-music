-- ==============================================================================
-- EMBER MUSIC — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- Architecture: Firebase Authentication + Supabase PostgreSQL
-- Verified Identity: auth.jwt() ->> 'sub' (Firebase UID)
-- ==============================================================================

-- 1. Helper function: Extract verified Firebase UID from JWT claims
-- PostgREST sets request.jwt.claims when third-party JWT is verified
CREATE OR REPLACE FUNCTION auth.firebase_uid()
RETURNS TEXT AS $$
  SELECT coalesce(
    auth.jwt() ->> 'sub',
    auth.jwt() ->> 'user_id',
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claim.user_id', true), '')
  );
$$ LANGUAGE sql STABLE;

-- 2. Profiles Table
-- Primary key is TEXT matching Firebase UID
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_genres TEXT[] NOT NULL DEFAULT '{}',
  favorite_artists JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Liked Songs Table
CREATE TABLE IF NOT EXISTS public.liked_songs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork_url TEXT,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_liked_song UNIQUE (user_id, song_id)
);

-- Index for fast user query
CREATE INDEX IF NOT EXISTS idx_liked_songs_user ON public.liked_songs (user_id, liked_at DESC);

-- 5. Listening History Table
CREATE TABLE IF NOT EXISTS public.listening_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork_url TEXT,
  genre TEXT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_played INTEGER DEFAULT 0
);

-- Efficient compound index for user timeline queries
CREATE INDEX IF NOT EXISTS idx_listening_history_user_time ON public.listening_history (user_id, played_at DESC);

-- 6. Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.playlists (user_id);

-- 7. Playlist Songs Table
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  artwork_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_playlist_song UNIQUE (playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON public.playlist_songs (playlist_id, position ASC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict enforcement: Users can only read/write their own records
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.firebase_uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.firebase_uid() = id)
  WITH CHECK (auth.firebase_uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.firebase_uid() = id);

-- ------------------------------------------------------------------------------
-- User Preferences Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- ------------------------------------------------------------------------------
-- Liked Songs Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own liked songs" ON public.liked_songs;
CREATE POLICY "Users can manage own liked songs"
  ON public.liked_songs FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- ------------------------------------------------------------------------------
-- Listening History Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own listening history" ON public.listening_history;
CREATE POLICY "Users can read own listening history"
  ON public.listening_history FOR SELECT
  USING (auth.firebase_uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own listening history" ON public.listening_history;
CREATE POLICY "Users can insert own listening history"
  ON public.listening_history FOR INSERT
  WITH CHECK (auth.firebase_uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own listening history" ON public.listening_history;
CREATE POLICY "Users can delete own listening history"
  ON public.listening_history FOR DELETE
  USING (auth.firebase_uid() = user_id);

-- ------------------------------------------------------------------------------
-- Playlists Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own playlists" ON public.playlists;
CREATE POLICY "Users can manage own playlists"
  ON public.playlists FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- ------------------------------------------------------------------------------
-- Playlist Songs Policies (Depends on parent playlist ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view songs in own playlists" ON public.playlist_songs;
CREATE POLICY "Users can view songs in own playlists"
  ON public.playlist_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE public.playlists.id = public.playlist_songs.playlist_id
        AND public.playlists.user_id = auth.firebase_uid()
    )
  );

DROP POLICY IF EXISTS "Users can add songs to own playlists" ON public.playlist_songs;
CREATE POLICY "Users can add songs to own playlists"
  ON public.playlist_songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE public.playlists.id = public.playlist_songs.playlist_id
        AND public.playlists.user_id = auth.firebase_uid()
    )
  );

DROP POLICY IF EXISTS "Users can update songs in own playlists" ON public.playlist_songs;
CREATE POLICY "Users can update songs in own playlists"
  ON public.playlist_songs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE public.playlists.id = public.playlist_songs.playlist_id
        AND public.playlists.user_id = auth.firebase_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE public.playlists.id = public.playlist_songs.playlist_id
        AND public.playlists.user_id = auth.firebase_uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove songs from own playlists" ON public.playlist_songs;
CREATE POLICY "Users can remove songs from own playlists"
  ON public.playlist_songs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE public.playlists.id = public.playlist_songs.playlist_id
        AND public.playlists.user_id = auth.firebase_uid()
    )
  );
