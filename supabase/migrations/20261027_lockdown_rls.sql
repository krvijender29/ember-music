-- ==============================================================================
-- EMBER MUSIC — SUPABASE POSTGRESQL PRODUCTION RLS HARDENING MIGRATION
-- Enforces true Zero-Trust Row Level Security (RLS) across all user tables.
-- Eliminates "OR auth.role() = 'anon'" anonymous bypass vulnerabilities.
-- Verified Identity: auth.firebase_uid() = user_id / id
-- ==============================================================================

-- 1. Ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.liked_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_history ENABLE ROW LEVEL SECURITY;

-- 2. Profiles: Read-only for all users (for public playlists and collaborator avatars),
-- but INSERT, UPDATE, and DELETE strictly require matching verified user UID.
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
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

-- 3. User Preferences: Strict user isolation (no anon access)
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- 4. Liked Songs: Strict user isolation (no anon access)
DROP POLICY IF EXISTS "Users can manage own liked songs" ON public.liked_songs;
CREATE POLICY "Users can manage own liked songs"
  ON public.liked_songs FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- 5. Listening History: Strict user isolation (no anon access)
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

-- 6. Playlists: Strict user isolation (no anon access)
DROP POLICY IF EXISTS "Users can manage own playlists" ON public.playlists;
CREATE POLICY "Users can manage own playlists"
  ON public.playlists FOR ALL
  USING (auth.firebase_uid() = user_id)
  WITH CHECK (auth.firebase_uid() = user_id);

-- 7. Playlist Songs: Subordinated to parent playlist ownership (no anon access)
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

-- 8. Search History: Strict user isolation (no anon access)
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
