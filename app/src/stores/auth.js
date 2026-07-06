import { create } from 'zustand';
import {
  readAuthSession,
  writeAuthSession,
  clearAuthSession,
  clearProgressSession,
  markAuthChecked,
  hasAuthChecked,
} from '@/lib/session-cache.js';

const cachedAuth = typeof window !== 'undefined' ? readAuthSession() : null;
const authReadyInit = typeof window !== 'undefined' && hasAuthChecked();

export const useAuthStore = create((set) => ({
  user: cachedAuth,
  authReady: authReadyInit,
  _setUser: (user) => {
    if (user) writeAuthSession(user);
    else clearAuthSession();
    markAuthChecked();
    set({ user, authReady: true });
  },
  signIn: async () => {
    const { auth, googleProvider, signInWithPopup } = await import('@/lib/firebase.js');
    return signInWithPopup(auth, googleProvider);
  },
  signOut: async () => {
    const uid = useAuthStore.getState().user?.uid;
    if (uid) clearProgressSession(uid);
    clearAuthSession();
    const { auth, signOut } = await import('@/lib/firebase.js');
    return signOut(auth);
  },
}));

if (typeof window !== 'undefined') {
  import('@/lib/firebase.js')
    .then(({ auth, onAuthStateChanged }) => {
      onAuthStateChanged(auth, (user) => {
        useAuthStore.getState()._setUser(user);
        import('@/stores/progress.js').then(({ useProgressStore }) => {
          useProgressStore.getState().load(user);
        });
      });
    })
    .catch((err) => {
      console.error('[auth] init failed', err);
      useAuthStore.getState()._setUser(null);
    });
}
