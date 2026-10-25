/**
 * EMBER - Client Configuration
 * Manages Firebase Authentication and Supabase PostgreSQL credentials.
 * Supports environment overrides via window.__ENV__ or localStorage.
 */

const EmberConfig = {
  // Firebase Web Client Configuration (Public API Keys only)
  FIREBASE: {
    apiKey: window.__ENV__?.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
    authDomain: window.__ENV__?.FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN",
    projectId: window.__ENV__?.FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: window.__ENV__?.FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: window.__ENV__?.FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    appId: window.__ENV__?.FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID"
  },

  // Supabase PostgreSQL Configuration (Public Anon Key only - Never service_role)
  SUPABASE: {
    url: window.__ENV__?.SUPABASE_URL || "YOUR_SUPABASE_URL",
    anonKey: window.__ENV__?.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY"
  },

  // Check if Firebase is configured with real credentials
  isFirebaseConfigured() {
    const key = this.FIREBASE.apiKey;
    return Boolean(key && !key.startsWith("YOUR_") && key.length > 10);
  },

  // Check if Supabase is configured with real credentials
  isSupabaseConfigured() {
    const url = this.SUPABASE.url;
    const key = this.SUPABASE.anonKey;
    return Boolean(url && !url.startsWith("YOUR_") && key && !key.startsWith("YOUR_"));
  },

  // Load custom override from localStorage if user plugged in keys through UI
  loadCustomOverrides() {
    try {
      const fb = localStorage.getItem('ember_fb_config');
      if (fb) {
        const parsed = JSON.parse(fb);
        this.FIREBASE = { ...this.FIREBASE, ...parsed };
      }
      const sb = localStorage.getItem('ember_sb_config');
      if (sb) {
        const parsed = JSON.parse(sb);
        this.SUPABASE = { ...this.SUPABASE, ...parsed };
      }
    } catch (_) {}
  },

  // Save custom overrides
  saveCustomOverrides(fbConfig, sbConfig) {
    if (fbConfig) {
      localStorage.setItem('ember_fb_config', JSON.stringify(fbConfig));
      this.FIREBASE = { ...this.FIREBASE, ...fbConfig };
    }
    if (sbConfig) {
      localStorage.setItem('ember_sb_config', JSON.stringify(sbConfig));
      this.SUPABASE = { ...this.SUPABASE, ...sbConfig };
    }
  }
};

// Initialize overrides on load
EmberConfig.loadCustomOverrides();
