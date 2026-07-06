import { WritingSeenBadge } from '@/components/progress/WritingProgress.jsx';

export default function WritingListItem({ writing, lang }) {
  return (
    <a
      href={`/${lang}/writing/${writing.id}`}
      className="card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
        {writing.level && (
          <span className={`badge badge-${writing.level}`}>{writing.level.toUpperCase()}</span>
        )}
        <WritingSeenBadge writingId={writing.id} />
      </div>
      <h3>{writing.title}</h3>
    </a>
  );
}
