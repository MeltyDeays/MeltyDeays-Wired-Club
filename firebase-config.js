/* Configuración de Google Cloud Firebase / Firestore */
/* The Wired Club - MeltyDeays */

export function getSavedFirebaseConfig() {
  try {
    const saved = localStorage.getItem("melty_firebase_config");
    return saved ? JSON.parse(saved) : {
      projectId: "meltydeays",
      authDomain: "meltydeays.firebaseapp.com"
    };
  } catch (e) {
    return { projectId: "meltydeays" };
  }
}

export function saveFirebaseConfig(config) {
  localStorage.setItem("melty_firebase_config", JSON.stringify(config));
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
    console.log("✓ Conectado a Google Cloud Firestore:", activeConfig.projectId);
  } catch (err) {
    console.warn("Firebase en espera de API Key activa:", err);
  }
}