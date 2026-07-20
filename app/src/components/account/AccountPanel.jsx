import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';
import { SRS } from '@/lib/srs.js';
import { allLessons } from '@/content/lessons/index.js';
import { allTopics } from '@/content/grammar/index.js';
import vocabIndex from '@/content/vocabulary/index.js';
import ActivityCalendar from '@/components/ui/ActivityCalendar.jsx';
import Loader from '@/components/ui/Loader.jsx';
import { withBase } from '@/lib/paths.js';

export default function AccountPanel({ lang = 'ru' }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const data = useProgressStore((s) => s.data);
  const loaded = useProgressStore((s) => s.loaded);
  const load = useProgressStore((s) => s.load);
  const getStats = useProgressStore((s) => s.getStats);
  const getLevelProgress = useProgressStore((s) => s.getLevelProgress);
  const reset = useProgressStore((s) => s.reset);

  useEffect(() => {
    load(user);
  }, [user, load]);

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Войдите, чтобы увидеть статистику и прогресс.</p>
      </div>
    );
  }

  if (!loaded || !data) {
    return <Loader variant="block" label="Загрузка прогресса..." />;
  }

  const stats = getStats();
  const totalLessons = allLessons.length;
  const totalGrammar = allTopics.length;
  const totalWords = vocabIndex.totalWords || 0;
  const levels = getLevelProgress(allLessons);
  const srsStats = SRS.getStats(data);
  const srsCount = srsStats.total;
  const dueCount = srsStats.due;
  const testResults = data.testResults || {};
  const history = data.exerciseHistory || [];
  const recentHistory = [...history].slice(-15).reverse();

  const handleReset = () => {
    if (confirm('Сбросить весь прогресс? Отменить действие нельзя.')) {
      reset(user);
    }
  };

  return (
    <div>
      <div className="account-card" style={{ marginBottom: '1.5rem' }}>
        <div className="account-card__avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="account-card__initials">
              {(user.displayName || user.email || '?').slice(0, 1)}
            </span>
          )}
        </div>
        <div className="account-card__body">
          <div className="account-card__name">{user.displayName || 'User'}</div>
          <div className="account-card__email">{user.email}</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">
            {stats.lessonsCompleted}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{totalLessons}</span>
          </div>
          <div className="stat-label">Уроков пройдено</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats.grammarViewed}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{totalGrammar}</span>
          </div>
          <div className="stat-label">Грамматика</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.correctRate}%</div>
          <div className="stat-label">Правильных ответов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Дней подряд</div>
        </div>
        <a href={withBase(`/${lang}/flashcards`)} className="stat-card stat-card--link" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-value">
            {srsCount}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{totalWords}</span>
          </div>
          <div className="stat-label">В изучении (SRS)</div>
        </a>
        <a
          href={dueCount > 0 ? withBase(`/${lang}/flashcards?mode=review`) : withBase(`/${lang}/flashcards`)}
          className="stat-card stat-card--link"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="stat-value" style={{ color: dueCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
            {dueCount}
          </div>
          <div className="stat-label">К повтору</div>
        </a>
      </div>

      <section className="page-section" style={{ marginBottom: '1.5rem' }}>
        <div className="page-section__head">
          <h2>Прогресс по уровням</h2>
        </div>
        <div className="level-progress">
          {levels.map((lv) => (
            <div key={lv.id} className="level-progress-item" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <span>{lv.title}</span>
                <span className={`badge badge-${lv.id.toLowerCase()}`}>{lv.id}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${lv.percent}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.4rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>
                <span>{lv.done} из {lv.total} уроков</span>
                <span>{lv.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section" style={{ marginBottom: '1.5rem' }}>
        <div className="page-section__head">
          <h2>Активность</h2>
        </div>
        <ActivityCalendar history={history} />
      </section>

      {Object.keys(testResults).length > 0 && (
        <section className="page-section" style={{ marginBottom: '1.5rem' }}>
          <div className="page-section__head">
            <h2>Результаты тестов</h2>
            <span className="page-section__count">{Object.keys(testResults).length}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Тест</th>
                  <th>Результат</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(testResults)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, r]) => {
                    const parts = key.split('/');
                    const testLevel = r.level || parts[0] || key;
                    const testNum = parts[1] || '';
                    return (
                      <tr key={key}>
                        <td>
                          <span className={`badge badge-${String(testLevel).toLowerCase()}`}>
                            {String(testLevel).toUpperCase()}
                          </span>
                          <a href={withBase(`/${lang}/tests/${testLevel}/${testNum || '01'}`)} style={{ marginLeft: '.4rem' }}>
                            Вариант {testNum || key}
                          </a>
                        </td>
                        <td style={{ color: r.passed ? 'var(--green)' : 'var(--red)' }}>
                          {r.correct}/{r.total} ({r.percent}%) {r.passed ? '✓' : ''}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="page-section" style={{ marginBottom: '1.5rem' }}>
        <div className="page-section__head">
          <h2>Последние упражнения</h2>
          <span className="page-section__count">{recentHistory.length}</span>
        </div>
        {recentHistory.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Тема</th>
                  <th>Результат</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <a href={withBase(`/${lang}/grammar/${h.topic}`)}>{h.topic}</a>
                    </td>
                    <td>
                      {h.correct}/{h.total} ({h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0}%)
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {h.date ? new Date(h.date).toLocaleDateString('ru-RU') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Пока нет истории</p>
        )}
      </section>

      <div className="card">
        <h3>Управление аккаунтом</h3>
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
            Выйти из аккаунта
          </button>
          <button type="button" className="btn btn-secondary" style={{ color: 'var(--red)' }} onClick={handleReset}>
            Сбросить прогресс
          </button>
        </div>
      </div>
    </div>
  );
}
