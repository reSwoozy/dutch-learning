import { useProgressStore } from '@/stores/progress.js';

export default function GrammarViewedBadge({ topicId }) {
  const viewed = useProgressStore((s) => s.isGrammarViewed(topicId));
  if (!viewed) return null;
  return <span className="badge" style={{ color: 'var(--green)' }}>Просмотрено</span>;
}
