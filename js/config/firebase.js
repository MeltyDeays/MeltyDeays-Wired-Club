/* Configuración de Google Cloud Firebase */
/* The Wired Club - MeltyDeays (Proyecto: Lain-Wired-Club) */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzoNf4_dMiwcb_H9Ob_kQ-bvRCn97Pyig",
  authDomain: "lain-wired-club.firebaseapp.com",
  databaseURL: "https://lain-wired-club-default-rtdb.firebaseio.com",
  projectId: "lain-wired-club",
  storageBucket: "lain-wired-club.firebasestorage.app",
  messagingSenderId: "651520561035",
  appId: "1:651520561035:web:7a71a6c0f9e40ce712e98e",
  measurementId: "G-CS2WQE7BWK"
};

export let db = null;
export let auth = null;
export let isConnectedToCloud = false;

if (typeof window !== "undefined" && window.firebase && FIREBASE_CONFIG.apiKey) {
  try {
    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = window.firebase.firestore();
    auth = window.firebase.auth();
    isConnectedToCloud = true;
    console.log("✓ Firebase inicializado en modo MVVM:", FIREBASE_CONFIG.projectId);

    if (auth && auth.signInAnonymously) {
      auth.signInAnonymously().catch(err => {
        console.warn("Auth anónima opcional:", err.code);
      });
    }
  } catch (err) {
    console.warn("Aviso Firebase:", err.message);
  }
}
