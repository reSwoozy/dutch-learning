import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';

export function WritingSeenBadge({ writingId }) {
  const data = useProgressStore((s) => s.data);
  if (!data?.writingSeen?.includes(writingId)) return null;
  return (
    <span className="badge" style={{ marginLeft: '.25rem' }}>
      Изучено
    </span>
  );
}

export default function WritingProgressToggle({ writingId }) {
  const user = useAuthStore((s) => s.user);
  const data = useProgressStore((s) => s.data);
  const mark = useProgressStore((s) => s.markWritingSeen);
  const unmark = useProgressStore((s) => s.unmarkWritingSeen);

  if (!data) return null;

  const done = data.writingSeen?.includes(writingId);

  const toggle = () => {
    if (done) unmark(writingId, user);
    else mark(writingId, user);
  };

  return (
    <button
      type="button"
      className={done ? 'btn btn-secondary' : 'btn btn-primary'}
      onClick={toggle}
      style={{ marginTop: '1.5rem' }}
    >
      {done ? 'Снять отметку' : 'Отметить как изучено'}
    </button>
  );
}
