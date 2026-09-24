/* Configuración de Google Cloud Firebase / Firestore */
/* The Wired Club - MeltyDeays */

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey:  AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig,
  authDomain: lain-wired-club.firebaseapp.com,
  databaseURL: https://lain-wired-club-default-rtdb.firebaseio.com,
  projectId: lain-wired-club,
  storageBucket: lain-wired-club.firebasestorage.app,
  messagingSenderId: 651520561035,
  appId: 1:651520561035:web:7a71a6c0f9e40ce712e98e,
  measurementId: G-CS2WQE7BWK
};

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem(melty_firebase_config);
    return saved ? JSON.parse(saved) : DEFAULT_FIREBASE_CONFIG;
  } catch (e) {
    return DEFAULT_FIREBASE_CONFIG;
  }
}

export function saveFirebaseConfig(config) {
  localStorage.setItem(melty_firebase_config, JSON.stringify(config));
  window.location.reload();
}

export let activeConfig = getSavedFirebaseConfig();
export let db = null;
export let auth = null;
export let isConnectedToRealFirebase = false;

if (window.firebase && activeConfig && activeConfig.apiKey) {
  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(activeConfig);
    }
    db = window.firebase.firestore();
    auth = window.firebase.auth();
    isConnectedToRealFirebase = true;
    console.log(✓ Conectado a Google Cloud Firestore:, activeConfig.projectId);
  } catch (err) {
    console.warn(Firebase inicializacion:, err);
  }
}
