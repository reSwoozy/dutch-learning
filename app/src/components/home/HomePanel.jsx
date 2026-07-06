import { useProgressStore } from '@/stores/progress.js';
import { SRS } from '@/lib/srs.js';
import Loader from '@/components/ui/Loader.jsx';
import { withBase } from '@/lib/paths.js';

export default function HomePanel({
  lang = 'ru',
  allLessons = [],
  totalGrammar = 0,
  totalLessons = 0,
  totalWords = 0,
}) {
  const data = useProgressStore((s) => s.data);

  if (!data) {
    return <Loader variant="block" label="Загрузка прогресса..." />;
  }

  const stats = {
    streak: data.streak || 0,
    correctRate: data.totalAnswered > 0 ? Math.round((data.totalCorrect / data.totalAnswered) * 100) : 0,
    grammarViewed: data.grammarViewed?.length || 0,
  };

  const srsStats = SRS.getStats(data);
  const dueCount = srsStats.due;
  const completed = new Set(data.lessonsCompleted || []);
  const nextLesson = allLessons.find((l) => !completed.has(l.id));
  const pad = (n) => String(n).padStart(2, '0');

  const levelLessons = nextLesson ? allLessons.filter((l) => l.level === nextLesson.level) : [];
  const levelPos = nextLesson ? levelLessons.findIndex((l) => l.id === nextLesson.id) + 1 : 0;
  const levelTotal = levelLessons.length;
  const levelLabel = nextLesson ? nextLesson.level.toUpperCase() : '';

  const continueBlock = nextLesson ? (
    <div className="continue-card">
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Продолжить
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '.25rem' }}>{nextLesson.title}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
          {levelLabel} · Урок {levelPos} из {levelTotal}
        </div>
      </div>
      <a href={withBase(`/${lang}/lessons/${nextLesson.level}/${pad(nextLesson.num)}`)} className="btn btn-primary">
        Открыть
      </a>
    </div>
  ) : (
    <div className="continue-card">
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Все уроки пройдены
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '.25rem' }}>Отличная работа!</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
          Продолжайте повторение и тесты
        </div>
      </div>
      <a href={withBase(`/${lang}/flashcards?mode=review`)} className="btn btn-primary">
        Повторять
      </a>
    </div>
  );

  const planItems = [];
  if (dueCount > 0) {
    planItems.push(
      <div key="srs" className="today-plan-item">
        <div className="tp-icon">SRS</div>
        <div style={{ fontWeight: 600 }}>Повторение карточек</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{dueCount} карточек готовы к повтору</div>
        <a href={withBase(`/${lang}/flashcards?mode=review`)} className="btn btn-primary" style={{ marginTop: 'auto' }}>
          Начать
        </a>
      </div>,
    );
  }
  if (nextLesson) {
    planItems.push(
      <div key="lesson" className="today-plan-item">
        <div className="tp-icon">{levelLabel}</div>
        <div style={{ fontWeight: 600 }}>Новый урок</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>{nextLesson.title}</div>
        <a
          href={withBase(`/${lang}/lessons/${nextLesson.level}/${pad(nextLesson.num)}`)}
          className="btn btn-secondary"
          style={{ marginTop: 'auto' }}
        >
          К уроку
        </a>
      </div>,
    );
  }
  if (totalGrammar > stats.grammarViewed) {
    planItems.push(
      <div key="grammar" className="today-plan-item">
        <div className="tp-icon">ГР</div>
        <div style={{ fontWeight: 600 }}>Грамматика</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
          {stats.grammarViewed}/{totalGrammar} тем изучено
        </div>
        <a href={withBase(`/${lang}/grammar`)} className="btn btn-secondary" style={{ marginTop: 'auto' }}>
          Открыть
        </a>
      </div>,
    );
  }

  return (
    <div>
      <div className="page-hero">
        <h1>Dutch Learning System</h1>
        <p className="page-hero__summary">
          A1 → B2 · Inburgering · {totalLessons} уроков, {totalGrammar} тем грамматики, {totalWords} слов
        </p>
        <div className="page-hero__meta">
          <span className="culture-pill culture-pill--muted">{stats.streak} дн. подряд</span>
          <span className="culture-pill culture-pill--muted">
            {dueCount > 0 ? `${dueCount} к повтору` : 'SRS в норме'}
          </span>
        </div>
      </div>

      {continueBlock}

      <div className="home-stripe">
        <div className="hs-item">
          <span className="hs-value">{stats.streak}</span>
          <span className="hs-label">дней подряд</span>
        </div>
        <div className="hs-sep" />
        <div className="hs-item">
          <span className="hs-value">{dueCount}</span>
          <span className="hs-label">карточек к повтору</span>
        </div>
        <div className="hs-sep" />
        <div className="hs-item">
          <span className="hs-value">{stats.correctRate}%</span>
          <span className="hs-label">точность</span>
        </div>
        <a href={withBase(`/${lang}/account`)} className="hs-link">
          Подробная статистика →
        </a>
      </div>

      {planItems.length > 0 && (
        <section className="page-section" style={{ marginTop: '1.5rem' }}>
          <div className="page-section__head">
            <h2>План на сегодня</h2>
            <span className="page-section__count">{planItems.length}</span>
          </div>
          <div className="today-plan">{planItems}</div>
        </section>
      )}

      <section className="page-section">
        <div className="page-section__head">
          <h2>Разделы</h2>
          <span className="page-section__count">6</span>
        </div>
        <div className="card-grid">
          <a href={withBase(`/${lang}/lessons`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Уроки</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>{totalLessons} уроков от A1 до B2</p>
          </a>
          <a href={withBase(`/${lang}/grammar`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Грамматика</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>{totalGrammar} тем A1–B2</p>
          </a>
          <a href={withBase(`/${lang}/flashcards`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Флеш-карточки</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
              {totalWords} слов с SRS
              {dueCount > 0 && (
                <>
                  {' '}
                  · <span style={{ color: 'var(--accent)' }}>{dueCount} к повтору</span>
                </>
              )}
            </p>
          </a>
          <a href={withBase(`/${lang}/verbs`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Неправильные глаголы</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Справочник с поиском и практиками</p>
          </a>
          <a href={withBase(`/${lang}/culture`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Культура</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Жизнь в Нидерландах и Inburgering</p>
          </a>
          <a href={withBase(`/${lang}/tests`)} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>Тесты</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>A1, A2, B1, B2</p>
          </a>
        </div>
      </section>
    </div>
  );
}
