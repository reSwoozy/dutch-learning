import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from '../firebase/app.js';

const LEGACY_BUFFER_KEY = 'dutch-progress-buffer';
const LEGACY_KEY = 'dutch-progress';

function readLegacyBuffer() {
  try {
    const raw =
      localStorage.getItem(LEGACY_BUFFER_KEY) ||
      localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLegacyBuffer() {
  try {
    localStorage.removeItem(LEGACY_BUFFER_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

function currentUid() {
  return auth.currentUser ? auth.currentUser.uid : null;
}

export const Progress = {
  HISTORY_CAP: 500,
  data: null,
  _saveTimer: null,

  async load() {
    const uid = currentUid();
    if (!uid) {
      this.data = this.getDefault();
      return this;
    }

    let firestoreProgress = null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d && d.progress && typeof d.progress === 'object') {
          firestoreProgress = d.progress;
        }
      }
    } catch (err) {
      console.error('[progress] load failed', err);
    }

    if (firestoreProgress) {
      this.data = firestoreProgress;
    } else {
      const legacy = readLegacyBuffer();
      this.data = legacy || this.getDefault();
      if (legacy) clearLegacyBuffer();
      await this._flush();
    }

    this.migrate();
    this.updateStreak();
    return this;
  },

  getDefault() {
    return {
      version: 5,
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
  },

  migrate() {
    const d = this.data;
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

    if (d.exerciseHistory.length > this.HISTORY_CAP) {
      d.exerciseHistory = d.exerciseHistory.slice(-this.HISTORY_CAP);
    }

    if (!d.version || d.version < 2) {
      const migrated = {};
      for (const [key, value] of Object.entries(d.srs)) {
        if (key.includes('::')) {
          migrated[key] = value;
        } else {
          migrated[`legacy::${key}`] = value;
        }
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
  },

  save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._flush().catch((err) => {
        console.error('[progress] save failed', err);
      });
    }, 500);
  },

  async flushNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    await this._flush();
  },

  async _flush() {
    const uid = currentUid();
    if (!uid || !this.data) return;
    this.data.lastActiveDate = new Date().toISOString().split('T')[0];
    await setDoc(
      doc(db, 'users', uid),
      {
        progress: this.data,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  isGrammarViewed(topicId) {
    return this.data.grammarViewed.includes(topicId);
  },

  markGrammarViewed(topicId) {
    if (!this.data.grammarViewed.includes(topicId)) {
      this.data.grammarViewed.push(topicId);
    }
    this.updateStreak();
    this.save();
  },

  isLessonCompleted(lessonId) {
    return this.data.lessonsCompleted.includes(lessonId);
  },

  markLessonCompleted(lessonId) {
    if (!this.data.lessonsCompleted.includes(lessonId)) {
      this.data.lessonsCompleted.push(lessonId);
    }
    this.updateStreak();
    this.save();
  },

  unmarkLessonCompleted(lessonId) {
    this.data.lessonsCompleted = this.data.lessonsCompleted.filter(
      (id) => id !== lessonId,
    );
    this.save();
  },

  isReadingRead(id) {
    return Array.isArray(this.data.readingRead) && this.data.readingRead.includes(id);
  },

  markReadingRead(id) {
    if (!Array.isArray(this.data.readingRead)) this.data.readingRead = [];
    if (!this.data.readingRead.includes(id)) {
      this.data.readingRead.push(id);
    }
    this.updateStreak();
    this.save();
  },

  unmarkReadingRead(id) {
    if (!Array.isArray(this.data.readingRead)) this.data.readingRead = [];
    this.data.readingRead = this.data.readingRead.filter((x) => x !== id);
    this.save();
  },

  recordExercise(topicId, correct, total) {
    this.data.exerciseHistory.push({
      topic: topicId,
      correct,
      total,
      date: new Date().toISOString(),
    });
    if (this.data.exerciseHistory.length > this.HISTORY_CAP) {
      this.data.exerciseHistory = this.data.exerciseHistory.slice(-this.HISTORY_CAP);
    }
    this.data.totalCorrect += correct;
    this.data.totalAnswered += total;
    this.updateStreak();
    this.save();
  },

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const last = this.data.lastActiveDate;

    if (!last) {
      this.data.streak = 0;
      return;
    }
    if (last === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (last === yesterdayStr) {
      this.data.streak = (this.data.streak || 0) + 1;
    } else if (last !== today) {
      this.data.streak = 0;
    }
  },

  getStats() {
    return {
      grammarViewed: this.data.grammarViewed.length,
      lessonsCompleted: this.data.lessonsCompleted.length,
      exercisesDone: this.data.exerciseHistory.length,
      correctRate:
        this.data.totalAnswered > 0
          ? Math.round((this.data.totalCorrect / this.data.totalAnswered) * 100)
          : 0,
      streak: this.data.streak || 0,
    };
  },

  async reset() {
    this.data = this.getDefault();
    await this.flushNow();
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (Progress._saveTimer) {
      clearTimeout(Progress._saveTimer);
      Progress._saveTimer = null;
      Progress._flush().catch(() => {});
    }
  });
}
