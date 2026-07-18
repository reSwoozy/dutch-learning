import { create } from 'zustand';
import { mapProgressData } from '@/lib/legacy-ids.js';
import { useAuthStore } from '@/stores/auth.js';
import {
  readAuthSession,
  readProgressSession,
  writeProgressSession,
} from '@/lib/session-cache.js';

const HISTORY_CAP = 500;
const LEGACY_BUFFER_KEY = 'dutch-progress-buffer';
const LEGACY_KEY = 'dutch-progress';

function getDefault() {
  return {
    version: 8,
    email: '',
    name: '',
    locale: 'ru',
    grammarViewed: [],
    lessonsCompleted: [],
    exerciseHistory: [],
    srs: {},
    testResults: {},
    readingRead: [],
    writingSeen: [],
    lastActiveDate: null,
    streak: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  };
}

function readLegacyBuffer() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_BUFFER_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLegacyBuffer() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_BUFFER_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

function hasFirestoreProgress(data) {
  if (!data) return false;
  return (
    (data.lessonsCompleted?.length || 0) > 0 ||
    (data.grammarViewed?.length || 0) > 0 ||
    Object.keys(data.srs || {}).length > 0 ||
    Object.keys(data.testResults || {}).length > 0 ||
    (data.readingRead?.length || 0) > 0 ||
    (data.writingSeen?.length || 0) > 0 ||
    (data.exerciseHistory?.length || 0) > 0
  );
}

function getInitialProgressState() {
  if (typeof window === 'undefined') return { data: null, loaded: false };
  const auth = readAuthSession();
  if (auth?.uid) {
    const cached = readProgressSession(auth.uid);
    if (cached) return { data: cached, loaded: true };
    return { data: null, loaded: false };
  }
  return { data: getDefault(), loaded: true };
}

const initialProgress = getInitialProgressState();

export const useProgressStore = create((set, get) => ({
  data: initialProgress.data,
  loaded: initialProgress.loaded,
  _saveTimer: null,

  async load(user) {
    if (!user) {
      set({ data: getDefault(), loaded: true });
      return;
    }

    const { db, doc, getDoc } = await import('@/lib/firebase.js');
    let data = null;
    let fromFirestore = false;

    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d?.progress && typeof d.progress === 'object') {
          data = d.progress;
          fromFirestore = hasFirestoreProgress(data);
        }
      }
    } catch (err) {
      console.error('[progress] load failed', err);
    }

    if (!fromFirestore) {
      const legacy = readLegacyBuffer();
      if (legacy && typeof legacy === 'object') {
        data = legacy;
        clearLegacyBuffer();
      }
    }

    if (!data) data = getDefault();

    migrate(data, user);
    updateStreak(data);

    const prev = get().data;
    // Skip zustand notify when Firestore returns the same streak the UI already shows.
    // Full data still refreshes when learning fields change.
    if (
      prev &&
      get().loaded &&
      prev.streak === data.streak &&
      prev.totalCorrect === data.totalCorrect &&
      prev.totalAnswered === data.totalAnswered &&
      prev.lastActiveDate === data.lastActiveDate &&
      JSON.stringify(prev.lessonsCompleted) === JSON.stringify(data.lessonsCompleted) &&
      JSON.stringify(prev.grammarViewed) === JSON.stringify(data.grammarViewed) &&
      JSON.stringify(prev.testResults) === JSON.stringify(data.testResults) &&
      JSON.stringify(prev.srs) === JSON.stringify(data.srs) &&
      JSON.stringify(prev.readingRead) === JSON.stringify(data.readingRead) &&
      JSON.stringify(prev.writingSeen) === JSON.stringify(data.writingSeen)
    ) {
      writeProgressSession(user.uid, prev);
      return;
    }

    set({ data, loaded: true });
    writeProgressSession(user.uid, data);
    get()._flush(user);
  },

  isLessonCompleted(id) {
    return get().data?.lessonsCompleted?.includes(id) ?? false;
  },

  markLessonCompleted(id, user) {
    set((s) => {
      if (!s.data) return s;
      const lc = s.data.lessonsCompleted.includes(id)
        ? s.data.lessonsCompleted
        : [...s.data.lessonsCompleted, id];
      const next = { ...s.data, lessonsCompleted: lc };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  unmarkLessonCompleted(id, user) {
    set((s) => {
      if (!s.data) return s;
      return {
        data: {
          ...s.data,
          lessonsCompleted: s.data.lessonsCompleted.filter((x) => x !== id),
        },
      };
    });
    get()._scheduleFlush(user);
  },

  isGrammarViewed(id) {
    return get().data?.grammarViewed?.includes(id) ?? false;
  },

  markGrammarViewed(id, user) {
    set((s) => {
      if (!s.data) return s;
      const gv = s.data.grammarViewed.includes(id)
        ? s.data.grammarViewed
        : [...s.data.grammarViewed, id];
      const next = { ...s.data, grammarViewed: gv };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  isReadingRead(id) {
    return get().data?.readingRead?.includes(id) ?? false;
  },

  markReadingRead(id, user) {
    set((s) => {
      if (!s.data) return s;
      const list = s.data.readingRead.includes(id)
        ? s.data.readingRead
        : [...s.data.readingRead, id];
      const next = { ...s.data, readingRead: list };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  unmarkReadingRead(id, user) {
    set((s) => {
      if (!s.data) return s;
      return {
        data: {
          ...s.data,
          readingRead: s.data.readingRead.filter((x) => x !== id),
        },
      };
    });
    get()._scheduleFlush(user);
  },

  isWritingSeen(id) {
    return get().data?.writingSeen?.includes(id) ?? false;
  },

  markWritingSeen(id, user) {
    set((s) => {
      if (!s.data) return s;
      const list = s.data.writingSeen.includes(id)
        ? s.data.writingSeen
        : [...s.data.writingSeen, id];
      const next = { ...s.data, writingSeen: list };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  unmarkWritingSeen(id, user) {
    set((s) => {
      if (!s.data) return s;
      return {
        data: {
          ...s.data,
          writingSeen: s.data.writingSeen.filter((x) => x !== id),
        },
      };
    });
    get()._scheduleFlush(user);
  },

  getTestResult(id) {
    return get().data?.testResults?.[id] ?? null;
  },

  saveTestResult(testId, payload, user) {
    set((s) => {
      if (!s.data) return s;
      const next = {
        ...s.data,
        testResults: {
          ...s.data.testResults,
          [testId]: { ...payload, testId, date: new Date().toISOString() },
        },
      };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  recordExercise(topicId, correct, total, user) {
    set((s) => {
      if (!s.data) return s;
      let history = [
        ...s.data.exerciseHistory,
        { topic: topicId, correct, total, date: new Date().toISOString() },
      ];
      if (history.length > HISTORY_CAP) history = history.slice(-HISTORY_CAP);
      const next = {
        ...s.data,
        exerciseHistory: history,
        totalCorrect: s.data.totalCorrect + correct,
        totalAnswered: s.data.totalAnswered + total,
      };
      updateStreak(next);
      return { data: next };
    });
    get()._scheduleFlush(user);
  },

  getStats() {
    const d = get().data;
    if (!d) return { grammarViewed: 0, lessonsCompleted: 0, exercisesDone: 0, correctRate: 0, streak: 0 };
    return {
      grammarViewed: d.grammarViewed.length,
      lessonsCompleted: d.lessonsCompleted.length,
      exercisesDone: d.exerciseHistory.length,
      correctRate: d.totalAnswered > 0 ? Math.round((d.totalCorrect / d.totalAnswered) * 100) : 0,
      streak: d.streak || 0,
    };
  },

  getLevelProgress(allLessons) {
    const completed = new Set(get().data?.lessonsCompleted || []);
    const levels = ['a1', 'a2', 'b1', 'b2'];
    return levels.map((id) => {
      const lessons = allLessons.filter((l) => l.level === id);
      const total = lessons.length;
      const done = lessons.filter((l) => completed.has(l.id)).length;
      return {
        id: id.toUpperCase(),
        title: id.toUpperCase(),
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  },

  async reset(user) {
    set({ data: getDefault() });
    await get()._flush(user);
  },

  _scheduleFlush(user) {
    const state = get();
    if (state._saveTimer) clearTimeout(state._saveTimer);
    const timer = setTimeout(() => {
      set({ _saveTimer: null });
      get()._flush(user);
    }, 500);
    set({ _saveTimer: timer });
  },

  async _flush(user) {
    const d = get().data;
    if (!user?.uid || !d) return;

    d.lastActiveDate = new Date().toISOString().split('T')[0];

    try {
      const { db, doc, setDoc, serverTimestamp } = await import('@/lib/firebase.js');
      await setDoc(
        doc(db, 'users', user.uid),
        { progress: d, updatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.error('[progress] save failed', err);
    }
  },
}));

export function migrate(d, user) {
  if (!Array.isArray(d.grammarViewed)) d.grammarViewed = [];
  if (!Array.isArray(d.lessonsCompleted)) d.lessonsCompleted = [];
  if (!Array.isArray(d.exerciseHistory)) d.exerciseHistory = [];
  if (!d.srs || typeof d.srs !== 'object') d.srs = {};
  if (!d.testResults || typeof d.testResults !== 'object') d.testResults = {};
  if (!Array.isArray(d.readingRead)) d.readingRead = [];
  if (!Array.isArray(d.writingSeen)) d.writingSeen = [];
  if (typeof d.totalCorrect !== 'number') d.totalCorrect = 0;
  if (typeof d.totalAnswered !== 'number') d.totalAnswered = 0;
  if (typeof d.streak !== 'number') d.streak = 0;

  if (d.exerciseHistory.length > HISTORY_CAP) {
    d.exerciseHistory = d.exerciseHistory.slice(-HISTORY_CAP);
  }

  if (!d.version || d.version < 2) {
    const migrated = {};
    for (const [key, value] of Object.entries(d.srs)) {
      migrated[key.includes('::') ? key : `legacy::${key}`] = value;
    }
    d.srs = migrated;
    d.version = 2;
  }

  if (d.version < 4) {
    delete d.knmResults;
    delete d.vocabLevel;
    delete d.vocabLoaded;
    d.version = 4;
  }

  if (d.version < 5) {
    delete d.lessonNotes;
    d.version = 5;
  }

  if (d.version < 7) {
    d.email = user?.email || d.email || '';
    d.name = user?.displayName || d.name || '';
    d.locale = d.locale || 'ru';
    d.version = 7;
  }

  if (d.version < 8) {
    mapProgressData(d);
    d.version = 8;
  }
}

export function updateStreak(d) {
  const today = new Date().toISOString().split('T')[0];
  const last = d.lastActiveDate;

  if (last === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (last === yesterdayStr) {
    d.streak = (d.streak || 0) + 1;
  } else {
    d.streak = 1;
  }
  d.lastActiveDate = today;
}

if (typeof window !== 'undefined') {
  useProgressStore.subscribe((state) => {
    const uid = useAuthStore.getState().user?.uid;
    if (uid && state.data && state.loaded) {
      writeProgressSession(uid, state.data);
    }
  });

  window.addEventListener('beforeunload', () => {
    const state = useProgressStore.getState();
    if (state._saveTimer) {
      clearTimeout(state._saveTimer);
      import('@/stores/auth.js').then(({ useAuthStore }) => {
        state._flush(useAuthStore.getState().user);
      });
    }
  });
}
