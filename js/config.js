/**
 * EMBER - Client Configuration
 * Manages Firebase Authentication and Supabase PostgreSQL credentials.
 * Supports environment overrides via window.__ENV__ or localStorage.
 */

const EmberConfig = {
  // Firebase Web Client Configuration
  FIREBASE: {
    apiKey: window.__ENV__?.FIREBASE_API_KEY || "AIzaSyAlgojP3zTxgbAVB8FhYW-_9R1zgdfHEjQ",
    authDomain: window.__ENV__?.FIREBASE_AUTH_DOMAIN || "ember-dcb78.firebaseapp.com",
    projectId: window.__ENV__?.FIREBASE_PROJECT_ID || "ember-dcb78",
    storageBucket: window.__ENV__?.FIREBASE_STORAGE_BUCKET || "ember-dcb78.firebasestorage.app",
    messagingSenderId: window.__ENV__?.FIREBASE_MESSAGING_SENDER_ID || "198177903871",
    appId: window.__ENV__?.FIREBASE_APP_ID || "1:198177903871:web:cb12df447398536af628ca",
    measurementId: window.__ENV__?.FIREBASE_MEASUREMENT_ID || "G-FWLW87Q0NW"
  },

  // Supabase PostgreSQL Configuration (Public Anon Key only - Never service_role)
  SUPABASE: {
    url: (window.__ENV__?.SUPABASE_URL || "https://ombptejuakpgaapeclyj.supabase.co").replace(/\/rest\/v1\/?$/, '').replace(/\/$/, ''),
    anonKey: window.__ENV__?.SUPABASE_ANON_KEY || "sb_publishable_RJOx9D6cYvi_75XCoWY8Dw_VDUHR8eF"
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
        if (parsed.url) parsed.url = parsed.url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
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
      if (sbConfig.url) sbConfig.url = sbConfig.url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
      localStorage.setItem('ember_sb_config', JSON.stringify(sbConfig));
      this.SUPABASE = { ...this.SUPABASE, ...sbConfig };
    }
  }
};

// Initialize overrides on load
EmberConfig.loadCustomOverrides();
