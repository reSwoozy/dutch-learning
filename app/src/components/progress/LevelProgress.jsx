import { useProgressStore } from '@/stores/progress.js';

export default function LevelProgress({ allLessons = [] }) {
  const data = useProgressStore((s) => s.data);
  const getLevelProgress = useProgressStore((s) => s.getLevelProgress);

  if (!data) return null;

  const levels = getLevelProgress(allLessons);

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2>Уровни</h2>
      {levels.map((lv) => {
        const levelLower = lv.id.toLowerCase();
        return (
          <div key={lv.id} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
              <span className={`badge badge-${levelLower}`}>{lv.id}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                {lv.done} из {lv.total} уроков
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '.85rem', color: 'var(--text-muted)' }}>
                {lv.percent}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${lv.percent}%`, transition: 'width .3s ease' }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
