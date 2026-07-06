import { ReadingReadBadge } from '@/components/progress/ReadingProgress.jsx';

export default function ReadingListItem({ reading, lang }) {
  const num = String(reading.num).padStart(2, '0');
  return (
    <a
      href={`/${lang}/reading/${reading.level}/${num}`}
      className="card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
        <span className={`badge badge-${reading.level}`}>{reading.level.toUpperCase()}</span>
        <ReadingReadBadge readingId={reading.id} />
      </div>
      <h3>{reading.title}</h3>
    </a>
  );
}
