import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

function cleanEnv(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['"]+|['"]+$/g, '');
}

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.PUBLIC_FB_API_KEY),
  authDomain: cleanEnv(import.meta.env.PUBLIC_FB_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.PUBLIC_FB_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.PUBLIC_FB_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.PUBLIC_FB_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.PUBLIC_FB_APP_ID),
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

try {
  await enableIndexedDbPersistence(db);
} catch (err) {
  if (err?.code === 'failed-precondition') {
    console.warn('[firebase] multi-tab persistence disabled');
  } else if (err?.code === 'unimplemented') {
    console.warn('[firebase] offline persistence not supported');
  }
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
};
