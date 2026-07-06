import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';

export function ReadingReadBadge({ readingId }) {
  const data = useProgressStore((s) => s.data);
  if (!data?.readingRead?.includes(readingId)) return null;
  return (
    <span className="badge" style={{ marginLeft: '.25rem' }}>
      Прочитано
    </span>
  );
}

export default function ReadingProgressToggle({ readingId, lang = 'ru' }) {
  const user = useAuthStore((s) => s.user);
  const data = useProgressStore((s) => s.data);
  const mark = useProgressStore((s) => s.markReadingRead);
  const unmark = useProgressStore((s) => s.unmarkReadingRead);

  if (!data) return null;

  const done = data.readingRead?.includes(readingId);

  const toggle = () => {
    if (done) unmark(readingId, user);
    else mark(readingId, user);
  };

  return (
    <button
      type="button"
      className={done ? 'btn btn-secondary' : 'btn btn-primary'}
      onClick={toggle}
      style={{ marginTop: '1.5rem' }}
    >
      {done ? 'Снять отметку «прочитано»' : 'Отметить как прочитано'}
    </button>
  );
}
