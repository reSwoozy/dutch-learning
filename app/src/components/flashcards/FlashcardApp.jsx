import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';
import { SRS } from '@/lib/srs.js';
import { loadAllVocabSets, buildVocabIndexFromSets } from '@/lib/vocab-sets.js';
import { flashcardSetIdFromLegacy } from '@/lib/legacy-ids.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatReviewDate(isoDate) {
  if (!isoDate) return '';
  const todayStr = new Date().toISOString().split('T')[0];
  if (isoDate <= todayStr) return 'сегодня';
  const d = new Date(`${isoDate}T00:00:00`);
  const diffDays = Math.round(
    (d.getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / 86400000,
  );
  if (diffDays === 1) return 'завтра';
  if (diffDays > 1 && diffDays <= 14) return `через ${diffDays} дн.`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function countLearnedInSet(data, set) {
  if (!data?.srs || !set.words?.length) return 0;
  return set.words.filter((w) => SRS.isWordLearned(data, set.id, w.nl, set.legacyId)).length;
}

function normalizeSrsKey(data, card) {
  const canonical = SRS.makeKey(card._setId, card.nl);
  let key = card.key || canonical;
  if (key !== canonical && data.srs?.[key]) {
    if (!data.srs[canonical]) data.srs[canonical] = { ...data.srs[key] };
    delete data.srs[key];
    key = canonical;
  }
  return key;
}

function FlashCard({ card, onRate }) {
  const [flipped, setFlipped] = useState(false);

  const rate = (q) => {
    setFlipped(false);
    onRate(q);
  };

  return (
    <div>
      <div className="flashcard-container">
        <div
          className={`flashcard${flipped ? ' flipped' : ''}`}
          onClick={() => setFlipped(!flipped)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setFlipped(!flipped);
            }
          }}
        >
          <div className="flashcard-face">
            <div className="flashcard-word">{card.nl}</div>
            {card.pronunciation && <div className="flashcard-hint">{card.pronunciation}</div>}
            <div className="flashcard-hint" style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--accent)' }}>
              Нажми, чтобы перевернуть
            </div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-word" style={{ color: 'var(--accent)' }}>
              {card.ru || '(нет перевода)'}
            </div>
            <div className="flashcard-hint" style={{ fontSize: '1.1rem', marginTop: '.5rem' }}>{card.nl}</div>
            {card.example && <div className="flashcard-example">{card.example}</div>}
            {card.hint && (
              <div className="flashcard-hint" style={{ marginTop: '.5rem', fontStyle: 'italic' }}>
                {typeof card.hint === 'object' ? card.hint.ru || '' : card.hint}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flashcard-controls" style={{ visibility: flipped ? 'visible' : 'hidden' }}>
        <button type="button" className="btn srs-btn-again" onClick={() => rate(0)}>
          <span>Не знаю</span>
          <span className="srs-btn__hint">завтра</span>
        </button>
        <button type="button" className="btn srs-btn-hard" onClick={() => rate(3)}>
          <span>Трудно</span>
          <span className="srs-btn__hint">через 1–2 дн.</span>
        </button>
        <button type="button" className="btn srs-btn-good" onClick={() => rate(4)}>
          <span>Хорошо</span>
          <span className="srs-btn__hint">рост интервала</span>
        </button>
        <button type="button" className="btn srs-btn-easy" onClick={() => rate(5)}>
          <span>Легко</span>
          <span className="srs-btn__hint">большой интервал</span>
        </button>
      </div>
    </div>
  );
}

function SessionView({ cards, onFinish, onRate }) {
  const [idx, setIdx] = useState(0);

  const handleRate = (q) => {
    onRate(cards[idx], q);
    if (idx < cards.length - 1) {
      setIdx(idx + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div>
      <div className="page-hero__meta" style={{ marginBottom: '.75rem' }}>
        <span className="culture-pill culture-pill--muted">
          {idx + 1} / {cards.length}
        </span>
      </div>
      <div className="progress-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="progress-fill" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} />
      </div>
      <FlashCard key={cards[idx].key || cards[idx].nl} card={cards[idx]} onRate={handleRate} />
    </div>
  );
}

const TIER_LABELS = {
  lessons: 'По урокам',
  core: 'Базовый словарь',
  extended: 'Расширенный словарь',
  themes: 'Тематические блоки',
};

const LEVELS = ['all', 'A1', 'A2', 'B1', 'B2'];

function levelMatches(setLevel, filter) {
  if (filter === 'all') return true;
  return (setLevel || '').toUpperCase() === filter.toUpperCase();
}

export default function FlashcardApp({ lang = 'ru', allLessons = [] }) {
  const user = useAuthStore((s) => s.user);
  const data = useProgressStore((s) => s.data);

  const allSets = useMemo(() => loadAllVocabSets(), []);
  const vocabIndex = useMemo(() => buildVocabIndexFromSets(allSets), [allSets]);
  const setById = useMemo(() => {
    const m = {};
    for (const s of allSets) {
      m[s.id] = s;
      if (s.legacyId) m[s.legacyId] = s;
    }
    return m;
  }, [allSets]);

  const [levelFilter, setLevelFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [screen, setScreen] = useState('hub');
  const [session, setSession] = useState(null);
  const [sessionDone, setSessionDone] = useState(false);
  const autoStarted = useRef(false);

  const lessonTitleById = useMemo(() => {
    const m = {};
    for (const l of allLessons) m[l.id] = l.title;
    return m;
  }, [allLessons]);

  const filteredSets = useMemo(() => {
    return allSets.filter((s) => {
      const levelOk = levelMatches(s.level || s.label, levelFilter);
      const tierOk = tierFilter === 'all' || s.tier === tierFilter;
      return levelOk && tierOk;
    });
  }, [allSets, levelFilter, tierFilter]);

  const setsByTier = useMemo(() => {
    const groups = { core: [], extended: [], themes: [], lessons: [] };
    for (const s of filteredSets) {
      if (groups[s.tier]) groups[s.tier].push(s);
    }
    return groups;
  }, [filteredSets]);

  const handleRate = useCallback(
    (card, quality) => {
      if (!data) return;
      const key = normalizeSrsKey(data, card);
      SRS.updateCard(data, key, quality);
      useProgressStore.setState({ data: { ...data, srs: { ...data.srs } } });
      useProgressStore.getState()._scheduleFlush(user);
    },
    [data, user],
  );

  const startSet = useCallback(
    (set) => {
      let words = set.words.map((w) => ({ ...w, _setId: set.id }));
      if (data) {
        words = words.filter((w) => !SRS.isWordLearned(data, set.id, w.nl, set.legacyId));
      }
      setScreen('session');
      if (words.length === 0) {
        setSession({ setId: set.id, legacyId: set.legacyId, cards: [], done: true });
        setSessionDone(true);
        return;
      }
      setSession({ setId: set.id, legacyId: set.legacyId, cards: shuffle(words), done: false });
      setSessionDone(false);
    },
    [data],
  );

  const startReview = useCallback(() => {
    if (!data) return;
    const cards = shuffle(SRS.getDueCards(data, vocabIndex));
    setScreen('session');
    if (cards.length === 0) {
      setSession({ setId: 'review', cards: [], done: true });
      setSessionDone(true);
      return;
    }
    setSession({ setId: 'review', cards, done: false });
    setSessionDone(false);
  }, [data, vocabIndex]);

  const resetSet = useCallback(
    (setId, legacyId) => {
      if (!data) return;
      SRS.resetLearnedInLesson(data, setId, legacyId);
      useProgressStore.setState({ data: { ...data, srs: { ...data.srs } } });
      useProgressStore.getState()._scheduleFlush(user);
      setSession(null);
      setSessionDone(false);
      setScreen('hub');
    },
    [data, user],
  );

  const removeFromReview = useCallback(
    (key) => {
      if (!data) return;
      SRS.removeCard(data, key);
      useProgressStore.setState({ data: { ...data, srs: { ...data.srs } } });
      useProgressStore.getState()._scheduleFlush(user);
    },
    [data, user],
  );

  const backToHub = useCallback(() => {
    setSession(null);
    setSessionDone(false);
    setScreen('hub');
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('set');
    window.history.replaceState({}, '', url.pathname);
  }, []);

  useEffect(() => {
    if (autoStarted.current || !allSets.length) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'review') {
      autoStarted.current = true;
      startReview();
      return;
    }
    if (params.get('mode') === 'learning') {
      autoStarted.current = true;
      setScreen('learning');
      return;
    }
    const setParam = params.get('set');
    if (!setParam) return;
    const canonical = flashcardSetIdFromLegacy(setParam);
    const found = allSets.find((s) => s.id === canonical || s.id === setParam || s.legacyId === setParam);
    if (found) {
      autoStarted.current = true;
      startSet(found);
    }
  }, [allSets, startSet, startReview]);

  useEffect(() => {
    if (screen === 'session' && session && !sessionDone && session.cards.length === 0) {
      setSessionDone(true);
    }
  }, [screen, session, sessionDone]);

  const learningCards = useMemo(() => {
    if (!data) return [];
    return SRS.getAllCards(data, vocabIndex);
  }, [data, vocabIndex]);

  if (screen === 'learning') {
    const srsStats = data ? SRS.getStats(data) : { total: 0, due: 0, nextDate: null };
    return (
      <div>
        <button type="button" className="btn btn-secondary" onClick={backToHub} style={{ marginBottom: '1rem' }}>
          &larr; К наборам
        </button>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {srsStats.due > 0 ? (
            <button type="button" className="btn btn-primary" onClick={startReview}>
              Начать повторение ({srsStats.due})
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" disabled>
              Начать повторение
            </button>
          )}
        </div>
        {learningCards.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--text-muted)' }}>
              Список пуст. Открой любой набор, оцени слова кнопками «Не знаю», «Трудно», «Хорошо» или «Легко» — и они появятся здесь.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nederlands</th>
                  <th>Русский</th>
                  <th>Статус</th>
                  <th>Интервал</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {learningCards.map((c) => (
                  <tr key={c.key}>
                    <td>
                      <strong>{c.nl}</strong>
                      {c.pronunciation && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{c.pronunciation}</div>
                      )}
                    </td>
                    <td>{c.ru}</td>
                    <td>
                      {c.isDue ? (
                        <span style={{ color: 'var(--accent)' }}>К повтору</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{formatReviewDate(c.nextReview)}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>
                      {c.interval > 0 ? `${c.interval} дн.` : '—'}
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-small" onClick={() => removeFromReview(c.key)}>
                        Убрать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'session' && session && !sessionDone && session.cards.length > 0) {
    return (
      <div>
        <button type="button" className="btn btn-secondary" onClick={backToHub} style={{ marginBottom: '1rem' }}>
          &larr; К наборам
        </button>
        <SessionView cards={session.cards} onRate={handleRate} onFinish={() => setSessionDone(true)} />
      </div>
    );
  }

  if (sessionDone && session) {
    const setMeta = session.setId !== 'review' ? setById[session.setId] : null;
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>{session.cards.length === 0 ? 'Набор пройден!' : 'Сессия завершена!'}</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '.5rem' }}>
          {session.cards.length === 0
            ? 'Все слова в этом наборе отмечены как «Хорошо» или «Легко».'
            : 'Отличная работа! Продолжайте в том же духе.'}
        </p>
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={backToHub}>
            К наборам
          </button>
          {session.setId === 'review' && (
            <button type="button" className="btn btn-secondary" onClick={() => { setScreen('learning'); setSession(null); setSessionDone(false); }}>
              Мои слова
            </button>
          )}
          {session.setId !== 'review' && setMeta && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => resetSet(session.setId, session.legacyId || setMeta.legacyId)}
            >
              Сбросить прогресс набора
            </button>
          )}
        </div>
      </div>
    );
  }

  const srsStats = data ? SRS.getStats(data) : { total: 0, due: 0, nextDate: null };
  const nextText = srsStats.nextDate ? formatReviewDate(srsStats.nextDate) : null;

  const renderSetCard = (set) => {
    const stats = data ? SRS.getSetStats(data, set.id, set.legacyId) : { learned: 0, due: 0, inReview: 0 };
    const learned = data ? countLearnedInSet(data, set) : 0;
    const total = set.words.length;
    const displayLevel = (set.label || set.level || 'a1').toString();
    const badgeLevel = displayLevel.toLowerCase();
    const cardTitle =
      set.tier === 'lessons'
        ? lessonTitleById[set.id] || lessonTitleById[set.legacyId] || set.title
        : set.title;

    return (
      <button
        key={set.id}
        type="button"
        className="card"
        style={{ textAlign: 'left', width: '100%', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
        onClick={() => startSet(set)}
      >
        {displayLevel && <span className={`badge badge-${badgeLevel}`}>{displayLevel}</span>}
        <h3 style={{ marginTop: '.5rem', marginBottom: '.25rem' }}>{cardTitle}</h3>
        <p className="flashcard-card-meta">
          {total} слов
          {learned > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--green)' }}>выучено {learned}</span>
            </>
          )}
          {stats.due > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--accent)' }}>повтор {stats.due}</span>
            </>
          )}
          {stats.due === 0 && stats.inReview > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--text-muted)' }}>в SRS {stats.inReview}</span>
            </>
          )}
        </p>
      </button>
    );
  };

  return (
    <div>
      <div
        className="card review-block"
        style={{
          marginBottom: '1.5rem',
          borderColor: srsStats.due > 0 ? 'var(--accent)' : 'var(--border)',
        }}
      >
        <div className="review-block__head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Интервальное повторение</h3>
            {srsStats.total === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginTop: '.25rem' }}>
                Оцени слово как «Не знаю» или «Трудно» в сессии — оно попадёт в SRS по методике SM-2.
              </p>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: '.25rem' }}>
                  {srsStats.due > 0 ? (
                    <span><span style={{ color: 'var(--accent)' }}>{srsStats.due}</span> к повтору сейчас</span>
                  ) : (
                    'Сейчас нечего повторять'
                  )}
                  {' · всего в изучении '}
                  {srsStats.total}
                </p>
                {nextText && srsStats.due === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}>
                    Следующее повторение — {nextText}
                  </p>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {srsStats.due > 0 ? (
              <button type="button" className="btn btn-primary btn-review" onClick={startReview}>
                Повторить · {srsStats.due}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-review" disabled>
                Повторить · 0
              </button>
            )}
            {srsStats.total > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setScreen('learning')}>
                Мои слова ({srsStats.total})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__group">
          <span className="filter-bar__label">Уровень</span>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`pill${levelFilter === lv ? ' is-active' : ''}`}
              onClick={() => setLevelFilter(lv)}
            >
              {lv === 'all' ? 'Все' : lv}
            </button>
          ))}
        </div>
        <div className="filter-bar__group">
          <span className="filter-bar__label">Тип</span>
          {[
            ['all', 'Все'],
            ['lessons', 'По урокам'],
            ['core', 'Базовый'],
            ['extended', 'Расширенный'],
            ['themes', 'Темы'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`pill${tierFilter === val ? ' is-active' : ''}`}
              onClick={() => setTierFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredSets.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>Нет наборов под выбранный фильтр.</p>
        </div>
      ) : (
        ['core', 'extended', 'themes', 'lessons'].map((tier) => {
          const sets = setsByTier[tier];
          if (!sets.length) return null;
          return (
            <section key={tier} className="page-section">
              <div className="page-section__head">
                <h2>{TIER_LABELS[tier]}</h2>
                <span className="page-section__count">{sets.length}</span>
              </div>
              {tier === 'lessons' ? (
                ['a1', 'a2', 'b1', 'b2'].map((lv) => {
                  const levelSets = sets.filter((s) => (s.level || s.label || '').toLowerCase() === lv);
                  if (!levelSets.length) return null;
                  return (
                    <div key={lv}>
                      <h3 style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{lv.toUpperCase()}</h3>
                      <div className="card-grid">{levelSets.map(renderSetCard)}</div>
                    </div>
                  );
                })
              ) : (
                <div className="card-grid">{sets.map(renderSetCard)}</div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
