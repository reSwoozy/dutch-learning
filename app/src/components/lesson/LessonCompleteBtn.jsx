import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';
import Loader from '@/components/ui/Loader.jsx';

export default function LessonCompleteBtn({ lessonId }) {
  const user = useAuthStore((s) => s.user);
  const data = useProgressStore((s) => s.data);
  const markCompleted = useProgressStore((s) => s.markLessonCompleted);
  const unmarkCompleted = useProgressStore((s) => s.unmarkLessonCompleted);

  const done = data?.lessonsCompleted?.includes(lessonId) ?? false;

  if (!data) {
    return (
      <button type="button" className="btn btn-secondary" disabled>
        <Loader variant="inline" size="sm" label="Загрузка..." />
      </button>
    );
  }

  const toggle = () => {
    if (done) {
      unmarkCompleted(lessonId, user);
    } else {
      markCompleted(lessonId, user);
    }
  };

  return (
    <button
      type="button"
      className={done ? 'btn btn-secondary' : 'btn btn-primary'}
      onClick={toggle}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
    >
      {done ? (
        <>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Снять отметку
        </>
      ) : (
        '\u2713 Отметить пройденным'
      )}
    </button>
  );
}
