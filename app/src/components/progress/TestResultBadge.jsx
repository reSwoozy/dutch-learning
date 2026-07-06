import { useProgressStore } from '@/stores/progress.js';

export default function TestResultBadge({ testId }) {
  const result = useProgressStore((s) => s.getTestResult(testId));

  if (!result) return null;

  return (
    <span
      className="badge"
      style={{
        marginLeft: '.25rem',
        color: result.passed ? 'var(--green)' : 'var(--red)',
        borderColor: result.passed ? 'var(--green)' : 'var(--red)',
      }}
    >
      {result.passed ? 'Пройден' : `${result.percent}%`}
    </span>
  );
}
