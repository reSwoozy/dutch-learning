import { App } from '../core/app.js';
import { SRS } from '../core/srs.js';

Object.assign(App, {
  flashcardFilter: { level: 'all', tier: 'all' },

  setFlashcardFilter(kind, value) {
    this.flashcardFilter = { ...this.flashcardFilter, [kind]: value };
    const main = document.getElementById('main-content');
    if (main) this.renderFlashcards(main);
  },

  async renderFlashcards(el, setId) {
    if (setId === 'learning') {
      await this.renderLearningList(el);
      return;
    }
    if (setId) {
      await this.startFlashcardSession(el, setId);
      return;
    }

    const filter = this.flashcardFilter || { level: 'all', tier: 'all' };
    const levelMatch = (entryLevel) => filter.level === 'all' || entryLevel === filter.level;
    const tierMatch = (tierName) => filter.tier === 'all' || filter.tier === tierName;
    const srsStats = SRS.getStats(this.progress.data);
    const dueCount = srsStats.due;

    const totalW = this.vocabIndex ? this.vocabIndex.totalWords : '?';
    let html = this.pageHero(
      'Флеш-карточки',
      'Spaced Repetition System (SM-2). Выбери набор карточек для изучения.',
      [
        { text: `${totalW} слов`, muted: true },
        { text: dueCount > 0 ? `${dueCount} к повтору` : 'Повторений нет', muted: dueCount === 0 },
      ],
    );

    html += this.buildReviewBlock(srsStats);

    const levels = ['all', 'A1', 'A2', 'B1', 'B2'];
    const tiersFilter = [
      ['all', 'Все'],
      ['lessons', 'По урокам'],
      ['core', 'Базовый'],
      ['extended', 'Расширенный'],
      ['themes', 'Темы'],
    ];
    html += '<div class="filter-bar">';
    html += '<div class="filter-bar__group"><span class="filter-bar__label">Уровень</span>';
    for (const lv of levels) {
      const active = filter.level === lv ? ' is-active' : '';
      const label = lv === 'all' ? 'Все' : lv;
      html += `<button class="pill${active}" onclick="App.setFlashcardFilter('level', '${lv}')">${label}</button>`;
    }
    html += '</div>';
    html += '<div class="filter-bar__group"><span class="filter-bar__label">Тип</span>';
    for (const [val, label] of tiersFilter) {
      const active = filter.tier === val ? ' is-active' : '';
      html += `<button class="pill${active}" onclick="App.setFlashcardFilter('tier', '${val}')">${label}</button>`;
    }
    html += '</div></div>';

    const tiers = (this.vocabIndex && this.vocabIndex.tiers) || {
      lessons: [],
      core: [],
      extended: [],
      themes: [],
    };

    let shownSections = 0;

    if (tierMatch('core') && Array.isArray(tiers.core)) {
      const items = tiers.core.filter((e) => levelMatch(e.level));
      if (items.length > 0) {
        shownSections++;
        html += `<section class="page-section"><div class="page-section__head"><h2>Базовый словарь (по уровням)</h2><span class="page-section__count">${items.length}</span></div><div class="card-grid">`;
        for (const entry of items) {
          html += `
            <a href="#flashcards/${entry.id}" class="card" style="text-decoration:none;color:inherit">
              <span class="badge badge-${entry.level.toLowerCase()}">${entry.level}</span>
              <h3 style="margin-top:.5rem">Core ${entry.level}</h3>
              <p style="color:var(--text-muted);font-size:.85rem">${entry.wordCount} слов</p>
            </a>
          `;
        }
        html += '</div></section>';
      }
    }

    if (tierMatch('extended') && Array.isArray(tiers.extended)) {
      const items = tiers.extended.filter((e) => levelMatch(e.level));
      if (items.length > 0) {
        shownSections++;
        html += `<section class="page-section"><div class="page-section__head"><h2>Расширенный словарь</h2><span class="page-section__count">${items.length}</span></div><div class="card-grid">`;
        for (const entry of items) {
          html += `
            <a href="#flashcards/${entry.id}" class="card" style="text-decoration:none;color:inherit">
              <span class="badge badge-${entry.level.toLowerCase()}">${entry.level}</span>
              <h3 style="margin-top:.5rem">Extended ${entry.level}</h3>
              <p style="color:var(--text-muted);font-size:.85rem">${entry.wordCount} слов</p>
            </a>
          `;
        }
        html += '</div></section>';
      }
    }

    if (tierMatch('themes') && Array.isArray(tiers.themes)) {
      const items = tiers.themes.filter((e) => !e.level || levelMatch(e.level));
      if (items.length > 0) {
        shownSections++;
        html += `<section class="page-section"><div class="page-section__head"><h2>Тематические блоки</h2><span class="page-section__count">${items.length}</span></div><div class="card-grid">`;
        for (const entry of items) {
          const levelBadge = entry.level
            ? `<span class="badge badge-${entry.level.toLowerCase()}">${entry.level}</span>`
            : '';
          html += `
            <a href="#flashcards/${entry.id}" class="card" style="text-decoration:none;color:inherit">
              ${levelBadge}
              <h3 style="margin-top:.5rem">${this.escapeHtml(entry.title || entry.slug)}</h3>
              <p style="color:var(--text-muted);font-size:.85rem">${entry.wordCount} слов</p>
            </a>
          `;
        }
        html += '</div></section>';
      }
    }

    if (tierMatch('lessons') && this.lessonsIndex && Array.isArray(tiers.lessons)) {
      const items = tiers.lessons.filter((l) => levelMatch(l.level));
      if (items.length > 0) {
        shownSections++;
        html += '<section class="page-section"><div class="page-section__head"><h2>По урокам</h2><span class="page-section__count">' + items.length + '</span></div>';
        for (const level of this.lessonsIndex.levels) {
          const levelLessons = items.filter((l) => l.level === level.id);
          if (levelLessons.length === 0) continue;
          html += `<h3 style="margin-top:1rem;color:var(--text-muted)">${this.escapeHtml(level.titleRu || level.id)}</h3><div class="card-grid">`;
          for (const vl of levelLessons) {
            const lessonMeta = level.lessons.find((l) => l.num === vl.lesson);
            const title = lessonMeta ? lessonMeta.title : `Урок ${vl.lesson}`;
            html += `
              <a href="#flashcards/${vl.id}" class="card" style="text-decoration:none;color:inherit">
                <span class="badge badge-${vl.level.toLowerCase()}">${vl.level}</span>
                <h3 style="margin-top:.5rem">${title}</h3>
                <p style="color:var(--text-muted);font-size:.85rem">${vl.wordCount} слов</p>
              </a>
            `;
          }
          html += '</div>';
        }
        html += '</section>';
      }
    }

    if (shownSections === 0) {
      html += '<div class="card"><p style="color:var(--text-muted)">Нет наборов карточек под выбранный фильтр.</p></div>';
    }

    el.innerHTML = html;
  },

  buildReviewBlock(stats) {
    const { total, due, nextDate } = stats;
    if (total === 0) {
      return `
        <div class="card review-block review-block--empty" style="margin-bottom:1.5rem">
          <div class="review-block__head">
            <h3>Интервальное повторение</h3>
            <span class="review-block__badge review-block__badge--muted">пусто</span>
          </div>
          <p style="color:var(--text-muted);font-size:.9rem;margin-top:.25rem">
            В сессии карточек оцени слово как <strong>«Не знаю»</strong> или <strong>«Трудно»</strong> — и оно попадёт сюда на повторение по методике SM-2 (интервалы растут по мере запоминания).
          </p>
        </div>
      `;
    }

    const nextText = nextDate ? this.formatReviewDate(nextDate) : null;
    const dueLabel = due > 0
      ? `<span style="color:var(--accent)">${due}</span> к повтору сейчас`
      : 'Сейчас нечего повторять';
    const nextLine = due > 0
      ? (nextText ? `Следующая партия — ${nextText}` : 'Остальные слова ждут своего интервала')
      : (nextText ? `Следующее повторение — ${nextText}` : 'Все слова запомнены');

    const nextFull = nextDate ? this.formatReviewDateFull(nextDate) : null;
    const activeHint = `${due} ${this.plural(due, 'карточка готова', 'карточки готовы', 'карточек готовы')} к повтору сегодня`;
    const disabledHint = nextFull
      ? `Станет активной ${nextFull} — когда подойдёт срок следующего повторения`
      : 'Пока нечего повторять. Оцени слова в сессии, чтобы добавить их в очередь.';
    const buttonHtml = due > 0
      ? `<span class="tip-wrap" data-tooltip="${this.escapeAttr(activeHint)}">
          <a href="#flashcards/review" class="btn btn-primary btn-review" aria-label="${this.escapeAttr(activeHint)}">Повторить · ${due}</a>
        </span>`
      : `<span class="tip-wrap" data-tooltip="${this.escapeAttr(disabledHint)}">
          <button class="btn btn-secondary btn-review" disabled aria-label="${this.escapeAttr(disabledHint)}">Повторить · 0</button>
        </span>`;

    return `
      <div class="card review-block" style="margin-bottom:1.5rem;border-color:${due > 0 ? 'var(--accent)' : 'var(--border)'}">
        <div class="review-block__head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
          <div>
            <h3 style="margin:0">Интервальное повторение</h3>
            <p style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">
              ${dueLabel} · всего в изучении ${total}
            </p>
            <p style="color:var(--text-muted);font-size:.8rem;margin-top:.25rem">${nextLine}</p>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            ${buttonHtml}
            <a href="#flashcards/learning" class="btn btn-secondary">Мои слова (${total})</a>
          </div>
        </div>
      </div>
    `;
  },

  formatReviewDate(isoDate) {
    if (!isoDate) return '';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (isoDate <= todayStr) return 'сегодня';
    const d = new Date(`${isoDate}T00:00:00`);
    const diffDays = Math.round((d.getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / 86400000);
    if (diffDays === 1) return 'завтра';
    if (diffDays > 1 && diffDays <= 14) return `через ${diffDays} дн.`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  },

  formatReviewDateFull(isoDate) {
    if (!isoDate) return '';
    const d = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    const today = new Date();
    const sameYear = d.getFullYear() === today.getFullYear();
    return d.toLocaleDateString('ru-RU', sameYear
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' });
  },

  plural(n, one, few, many) {
    const num = Math.abs(Math.round(Number(n) || 0));
    const lastTwo = num % 100;
    const last = num % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  },

  formatIntervalDays(days) {
    const n = Math.max(0, Math.round(Number(days) || 0));
    if (n === 0) return 'завтра';
    if (n === 1) return 'через 1 день';
    const lastTwo = n % 100;
    const last = n % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return `через ${n} дней`;
    if (last === 1) return `через ${n} день`;
    if (last >= 2 && last <= 4) return `через ${n} дня`;
    return `через ${n} дней`;
  },

  async renderLearningList(el) {
    el.innerHTML = `
      <div class="breadcrumb"><a href="#flashcards">Карточки</a> / Мои слова на повторении</div>
      ${this.pageHero('Мои слова на повторении', 'Загружаем список...', [])}
    `;

    const stats = SRS.getStats(this.progress.data);
    const cards = await SRS.getAllCards(this.progress.data, this);
    cards.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      const av = a.nextReview || '';
      const bv = b.nextReview || '';
      if (av !== bv) return av < bv ? -1 : 1;
      return a.nl.localeCompare(b.nl);
    });

    const nextText = stats.nextDate ? this.formatReviewDate(stats.nextDate) : null;
    const pills = [
      { text: `${stats.total} слов`, muted: true },
      { text: stats.due > 0 ? `${stats.due} к повтору` : 'Нечего повторять', muted: stats.due === 0 },
    ];
    if (nextText && stats.due === 0) pills.push({ text: `След. ${nextText}`, muted: true });

    const nextFullLearning = stats.nextDate ? this.formatReviewDateFull(stats.nextDate) : null;
    const learningDisabledHint = nextFullLearning
      ? `Станет активной ${nextFullLearning} — когда подойдёт срок следующего повторения`
      : 'Пока нечего повторять. Оцени слова в сессии, чтобы добавить их в очередь.';
    const learningActiveHint = `${stats.due} ${this.plural(stats.due, 'карточка готова', 'карточки готовы', 'карточек готовы')} к повтору сегодня`;
    const actionBar = `
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
        ${stats.due > 0
          ? `<span class="tip-wrap" data-tooltip="${this.escapeAttr(learningActiveHint)}">
              <a href="#flashcards/review" class="btn btn-primary" aria-label="${this.escapeAttr(learningActiveHint)}">Начать повторение (${stats.due})</a>
            </span>`
          : `<span class="tip-wrap" data-tooltip="${this.escapeAttr(learningDisabledHint)}">
              <button class="btn btn-secondary" disabled aria-label="${this.escapeAttr(learningDisabledHint)}">Начать повторение</button>
            </span>`}
        <a href="#flashcards" class="btn btn-secondary">К наборам</a>
      </div>
    `;

    let body = '';
    if (cards.length === 0) {
      body = `
        <div class="card">
          <p style="color:var(--text-muted)">
            Список пуст. Открой любой набор карточек, оцени слова кнопками
            <strong>«Не знаю»</strong>, <strong>«Трудно»</strong>, <strong>«Хорошо»</strong> или <strong>«Легко»</strong> — и они появятся здесь.
          </p>
        </div>
      `;
    } else {
      const rows = cards.map((c) => {
        const status = c.isDue
          ? '<span style="color:var(--accent)">К повтору</span>'
          : `<span style="color:var(--text-muted)">${this.formatReviewDate(c.nextReview)}</span>`;
        const interval = c.interval > 0 ? `${c.interval} дн.` : '—';
        return `
          <tr>
            <td><strong>${this.escapeHtml(c.nl)}</strong>${c.pronunciation ? `<div style="color:var(--text-muted);font-size:.8rem">${this.escapeHtml(c.pronunciation)}</div>` : ''}</td>
            <td>${this.escapeHtml(c.ru)}</td>
            <td>${status}</td>
            <td style="color:var(--text-muted);font-size:.85rem">${interval}</td>
            <td><button class="btn btn-ghost btn-small" onclick="App.removeFromReview('${this.escapeAttr(c.key)}')">Убрать</button></td>
          </tr>
        `;
      }).join('');

      body = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nederlands</th>
                <th>Русский</th>
                <th>Статус</th>
                <th>Интервал</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="breadcrumb"><a href="#flashcards">Карточки</a> / Мои слова на повторении</div>
      ${this.pageHero('Мои слова на повторении', 'Слова, которые ты добавил, оценив их в сессии карточек. Повторения идут по методике SM-2: интервал растёт с каждым успешным ответом.', pills)}
      ${actionBar}
      ${body}
    `;
  },

  removeFromReview(key) {
    if (!key) return;
    const ok = SRS.removeCard(this.progress.data, key);
    if (!ok) return;
    this.progress.save();
    this.showToast('Слово убрано из повторения', 'success');
    const main = document.getElementById('main-content');
    if (main) this.renderLearningList(main);
  },

  async startFlashcardSession(el, setId) {
    let words = [];

    if (setId === 'review') {
      words = await SRS.getDueCards(this.progress.data, this);
      if (words.length === 0) {
        el.innerHTML = `
          <div class="breadcrumb"><a href="#flashcards">Карточки</a> / Повторение</div>
          ${this.pageHero('Нет карточек для повторения', 'Все карточки повторены. Возвращайся позже.', [])}
          <p style="margin-top:1rem"><a href="#flashcards" class="btn btn-primary">К наборам</a></p>
        `;
        return;
      }
    } else {
      words = await this.loadVocabSet(setId);
      if (!words || words.length === 0) {
        el.innerHTML = `
          <div class="breadcrumb"><a href="#flashcards">Карточки</a> / <span>Ошибка</span></div>
          ${this.pageHero('Не удалось загрузить карточки', 'Проверь подключение или выбери другой набор.', [{ text: String(setId), muted: true }])}
          <p style="margin-top:1rem"><a href="#flashcards" class="btn btn-primary">К наборам</a></p>
        `;
        return;
      }
      words = words.map((w) => ({ ...w, _lessonId: setId }));
    }

    const session = {
      words: this.shuffleArray([...words]),
      current: 0,
      flipped: false,
      correct: 0,
      incorrect: 0,
      setId
    };

    this._flashcardSession = session;
    this.renderFlashcard(el, session);
  },

  renderFlashcard(el, session) {
    const { words, current, flipped } = session;

    if (current >= words.length) {
      const total = session.correct + session.incorrect;
      const pct = total > 0 ? Math.round(session.correct / total * 100) : 0;
      el.innerHTML = `
        <div class="breadcrumb"><a href="#flashcards">Карточки</a> / Результат</div>
        <div class="page-hero page-hero--slim">
          <h1 class="culture-hero__title">Сессия завершена</h1>
          <div class="page-hero__meta">
            <span class="culture-pill">${total} карточек</span>
            <span class="culture-pill culture-pill--muted">${pct}% точность</span>
          </div>
        </div>
        <div class="stats-grid" style="margin-top:1.5rem">
          <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Всего карточек</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--green)">${session.correct}</div>
            <div class="stat-label">Правильно</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:var(--red)">${session.incorrect}</div>
            <div class="stat-label">Ошибки</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pct}%</div>
            <div class="stat-label">Точность</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:2rem">
          <a href="#flashcards" class="btn btn-primary">Назад к карточкам</a>
        </div>
      `;
      return;
    }

    const word = words[current];
    const total = words.length;

    const sessionTitle = session.setId === 'review' ? 'Повторение SRS' : 'Набор карточек';
    const sessionMeta = session.setId === 'review'
      ? ''
      : `<div class="page-hero__meta"><span class="culture-pill culture-pill--muted">${this.escapeHtml(String(session.setId))}</span></div>`;

    el.innerHTML = `
      <div class="breadcrumb"><a href="#flashcards">Карточки</a> / ${session.setId === 'review' ? 'Повторение' : this.escapeHtml(String(session.setId))}</div>
      <div class="page-hero page-hero--slim">
        <div class="page-hero__meta"><span class="culture-pill culture-pill--muted">${current + 1} / ${total}</span></div>
        <h1 class="culture-hero__title">${sessionTitle}</h1>
        ${sessionMeta}
      </div>
      <div class="progress-bar" style="margin-bottom:1.5rem">
        <div class="progress-fill" style="width:${Math.round((current / total) * 100)}%"></div>
      </div>
      <div class="flashcard-container">
        <div class="flashcard${flipped ? ' flipped' : ''}" id="flashcard" onclick="App.flipCard()">
          <div class="flashcard-face">
            <div class="flashcard-word">${word.nl}</div>
            ${word.pronunciation ? `<div class="flashcard-hint">${word.pronunciation}</div>` : ''}
            <div class="flashcard-hint" style="margin-top:1rem;font-size:.8rem;color:var(--accent)">Нажми, чтобы перевернуть</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-word">${word.ru}</div>
            <div class="flashcard-hint" style="font-size:1.1rem;margin-top:.5rem">${word.nl}</div>
            ${word.example ? `<div class="flashcard-example">${word.example}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="flashcard-controls" id="srs-controls" style="${flipped ? '' : 'visibility:hidden'}">
        <button class="btn srs-btn-again" onclick="App.rateCard(0)">
          <span>Не знаю <kbd>1</kbd></span>
          <span class="srs-btn__hint">завтра</span>
        </button>
        <button class="btn srs-btn-hard" onclick="App.rateCard(3)">
          <span>Трудно <kbd>2</kbd></span>
          <span class="srs-btn__hint">через 1–2 дн.</span>
        </button>
        <button class="btn srs-btn-good" onclick="App.rateCard(4)">
          <span>Хорошо <kbd>3</kbd></span>
          <span class="srs-btn__hint">рост интервала</span>
        </button>
        <button class="btn srs-btn-easy" onclick="App.rateCard(5)">
          <span>Легко <kbd>4</kbd></span>
          <span class="srs-btn__hint">большой интервал</span>
        </button>
      </div>
      <div class="kb-hint">
        <kbd>Space</kbd> перевернуть, <kbd>1</kbd>–<kbd>4</kbd> оценить. Слова попадают в список «<a href="#flashcards/learning">Мои слова на повторении</a>» и возвращаются по методике SM-2.
      </div>
      <div class="flashcard-stats">
        <span style="color:var(--green)">&#10003; ${session.correct}</span>
        <span style="color:var(--red)">&#10007; ${session.incorrect}</span>
      </div>
    `;
  },

  flipCard() {
    const session = this._flashcardSession;
    if (!session) return;
    session.flipped = !session.flipped;
    const card = document.getElementById('flashcard');
    const controls = document.getElementById('srs-controls');
    if (card) card.classList.toggle('flipped', session.flipped);
    if (controls) controls.style.visibility = session.flipped ? 'visible' : 'hidden';
  },

  rateCard(quality) {
    const session = this._flashcardSession;
    if (!session) return;

    const word = session.words[session.current];

    if (quality >= 3) {
      session.correct++;
    } else {
      session.incorrect++;
    }

    const key = SRS.makeKey(word._lessonId || session.setId, word.nl);
    SRS.updateCard(this.progress.data, key, quality);
    const card = this.progress.data.srs[key];
    this.progress.save();

    const intervalText = this.formatIntervalDays(card ? card.interval : 1);
    const toastType = quality >= 3 ? 'success' : 'error';
    this.showToast(`${word.nl} — вернётся ${intervalText}`, toastType);

    session.current++;
    session.flipped = false;

    const main = document.getElementById('main-content');
    this.renderFlashcard(main, session);
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  appendWordToInput(inputId, word) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const current = el.value.replace(/\s+$/, '');
    el.value = current ? `${current} ${word}` : word;
    el.focus();
  },
});
