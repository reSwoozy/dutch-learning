import { useProgressStore } from '@/stores/progress.js';

export default function LessonStatusPill({ lessonId }) {
  const data = useProgressStore((s) => s.data);

  if (!data) return null;
  if (!data.lessonsCompleted?.includes(lessonId)) return null;

  return (
    <span
      style={{
        fontSize: '.7rem',
        padding: '.15rem .45rem',
        borderRadius: 9999,
        background: 'var(--green)',
        color: '#fff',
        fontWeight: 600,
      }}
    >
      Пройдено
    </span>
  );
}
