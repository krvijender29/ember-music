/**
 * EMBER - Firebase Authentication Manager
 * Handles Email/Password sign up, sign in, Google Sign-In (Popup & Redirect),
 * password reset, persistent session management, and ID token retrieval for Supabase.
 */

var AuthManager = {
  _user: null,
  _initialized: false,
  _listeners: [],

  async init() {
    if (this._initialized) return;

    if (!window.firebase) {
      console.warn('[Ember Auth] Firebase SDK not loaded. Running in Guest Mode.');
      this._notifyListeners(null);
      this._initialized = true;
      return;
    }

    if (!EmberConfig.isFirebaseConfigured()) {
      console.info('[Ember Auth] Firebase credentials not yet configured. Guest Mode active.');
      const localSimulated = localStorage.getItem('ember_local_sim_user');
      if (localSimulated) {
        try {
          this._user = JSON.parse(localSimulated);
        } catch (_) {}
      }
      this._initialized = true;
      this._notifyListeners(this._user);
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(EmberConfig.FIREBASE);
      }

      // Set persistence to LOCAL explicitly
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      // Handle redirect result if returning from signInWithRedirect
      try {
        const redirectResult = await firebase.auth().getRedirectResult();
        if (redirectResult && redirectResult.user) {
          const u = redirectResult.user;
          this._user = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email.split('@')[0],
            photoURL: u.photoURL || null,
            _raw: u
          };
          this._notifyListeners(this._user);
        }
      } catch (redirErr) {
        console.warn('[Ember Auth] Redirect sign-in check warning:', redirErr);
      }

      firebase.auth().onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          this._user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL || null,
            _raw: firebaseUser
          };
        } else {
          this._user = null;
        }
        this._initialized = true;
        this._notifyListeners(this._user);
      });
    } catch (err) {
      console.error('[Ember Auth] Initialization error:', err);
      this._initialized = true;
      this._notifyListeners(null);
    }
  },

  onAuthStateChanged(callback) {
    this._listeners.push(callback);
    if (this._initialized) {
      callback(this._user);
    }
  },

  _notifyListeners(user) {
    this._listeners.forEach(cb => {
      try {
        cb(user);
      } catch (e) {
        console.error('[Ember Auth] Listener error:', e);
      }
    });
  },

  getCurrentUser() {
    return this._user;
  },

  isGuest() {
    return !this._user;
  },

  async getIdToken(forceRefresh = false) {
    if (!this._user) return null;
    if (this._user._raw && typeof this._user._raw.getIdToken === 'function') {
      return await this._user._raw.getIdToken(forceRefresh);
    }
    // Fallback for simulated development user
    return this._user.token || 'demo-firebase-token';
  },

  async signUp(email, password, displayName) {
    if (!email || !password) throw new Error('Email and password are required.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    if (!EmberConfig.isFirebaseConfigured()) {
      // Development simulated account
      const simUser = {
        uid: 'user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
        token: 'sim_jwt_' + Date.now()
      };
      this._user = simUser;
      localStorage.setItem('ember_local_sim_user', JSON.stringify(simUser));
      this._notifyListeners(this._user);
      return this._user;
    }

    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
    if (displayName && cred.user) {
      await cred.user.updateProfile({ displayName });
      this._user = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName,
        photoURL: cred.user.photoURL,
        _raw: cred.user
      };
      this._notifyListeners(this._user);
    }
    return this._user;
  },

  async signIn(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');

    if (!EmberConfig.isFirebaseConfigured()) {
      const simUser = {
        uid: 'user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
        email,
        displayName: email.split('@')[0],
        photoURL: null,
        token: 'sim_jwt_' + Date.now()
      };
      this._user = simUser;
      localStorage.setItem('ember_local_sim_user', JSON.stringify(simUser));
      this._notifyListeners(this._user);
      return this._user;
    }

    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
    this._user = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || cred.user.email.split('@')[0],
      photoURL: cred.user.photoURL,
      _raw: cred.user
    };
    this._notifyListeners(this._user);
    return this._user;
  },

  async signInWithGoogle() {
    if (!EmberConfig.isFirebaseConfigured()) {
      throw new Error(
        "FIREBASE_NOT_CONFIGURED: Google Sign-In requires your Firebase project credentials. Tap 'Cloud Settings' to configure your Firebase Web App keys."
      );
    }

    if (!window.firebase) {
      throw new Error("Firebase SDK failed to load. Please check your internet connection.");
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(EmberConfig.FIREBASE);
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    // Force prompt account picker
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // Try popup sign in first
      const result = await firebase.auth().signInWithPopup(provider);
      if (result && result.user) {
        this._user = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email.split('@')[0],
          photoURL: result.user.photoURL,
          _raw: result.user
        };
        this._notifyListeners(this._user);
        return this._user;
      }
      return null;
    } catch (popupErr) {
      console.warn('[Ember Auth] Google popup error:', popupErr);

      // If popup was blocked by browser or mobile webview, gracefully fall back to redirect
      if (
        popupErr.code === 'auth/popup-blocked' ||
        popupErr.code === 'auth/cancelled-popup-request'
      ) {
        console.info('[Ember Auth] Falling back to signInWithRedirect...');
        await firebase.auth().signInWithRedirect(provider);
        return null;
      }

      throw popupErr;
    }
  },

  async sendPasswordReset(email) {
    if (!email) throw new Error('Please enter your email address.');
    if (!EmberConfig.isFirebaseConfigured()) {
      return true;
    }
    await firebase.auth().sendPasswordResetEmail(email);
    return true;
  },

  async signOut() {
    if (EmberConfig.isFirebaseConfigured() && window.firebase) {
      await firebase.auth().signOut();
    }
    localStorage.removeItem('ember_local_sim_user');
    this._user = null;
    this._notifyListeners(null);
  }
};

window.AuthManager = AuthManager;
