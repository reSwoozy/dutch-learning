const App = {
  currentPage: 'home',
  grammarIndex: null,
  grammarTopics: {},
  lessonsIndex: null,
  vocabIndex: null,
  progress: null,

  async init() {
    this.progress = await Progress.load();
    const [gi, li, vi] = await Promise.all([
      this.fetchJSON('data/grammar/index.json'),
      this.fetchJSON('data/lessons/index.json'),
      this.fetchJSON('data/vocabulary/index.json'),
    ]);
    this.grammarIndex = gi;
    this.lessonsIndex = li;
    this.vocabIndex = vi;
    this.setupNavigation();
    this.setupKeyboardShortcuts();
    this.setupExerciseInteractions();
    this.route(location.hash || '#home');
    window.addEventListener('hashchange', () => this.route(location.hash));
  },

  setupExerciseInteractions() {
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.word-chip');
      if (!chip) return;
      const targetId = chip.dataset.target;
      if (!targetId) return;
      e.preventDefault();
      this.appendWordToInput(targetId, chip.textContent.trim());
    });
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSearch();
        return;
      }
      if (e.key === 'Escape' && this._searchOpen) {
        e.preventDefault();
        this.closeSearch();
        return;
      }

      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isInput) return;

      if (e.key === '/' && !this._searchOpen) {
        e.preventDefault();
        this.openSearch();
        return;
      }

      if (this.currentPage === 'flashcards' && this._flashcardSession) {
        const session = this._flashcardSession;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.flipCard();
          return;
        }
        if (session.flipped) {
          if (e.key === '1') { e.preventDefault(); this.rateCard(0); return; }
          if (e.key === '2') { e.preventDefault(); this.rateCard(3); return; }
          if (e.key === '3') { e.preventDefault(); this.rateCard(4); return; }
          if (e.key === '4') { e.preventDefault(); this.rateCard(5); return; }
        }
      }
    });
  },

  async buildSearchCorpus() {
    if (this._searchCorpus) return this._searchCorpus;
    const items = [];

    if (this.lessonsIndex) {
      for (const lv of this.lessonsIndex.levels) {
        for (const l of lv.lessons) {
          items.push({
            type: 'lesson',
            typeLabel: 'Урок',
            href: `#lessons/${l.id}`,
            title: l.title,
            sub: `${lv.id} · Урок ${l.num}`,
            search: `${l.title} ${lv.id} ${l.id} урок ${l.num}`.toLowerCase(),
          });
        }
      }
    }

    if (this.grammarIndex && this.grammarIndex.topics) {
      for (const [id, t] of Object.entries(this.grammarIndex.topics)) {
        items.push({
          type: 'grammar',
          typeLabel: 'Грамматика',
          href: `#grammar/${id}`,
          title: t.title,
          sub: `${t.level} · ${t.titleNL || id}`,
          search: `${t.title} ${t.titleNL || ''} ${t.level} ${id}`.toLowerCase(),
        });
      }
    }

    try {
      const all = await this.fetchJSON('data/vocabulary/search-index.json');
      if (Array.isArray(all)) {
        for (const w of all) {
          const href = w.tier === 'lesson' && w.setId
            ? `#flashcards/${w.setId}`
            : `#flashcards/${w.setId || ''}`;
          const levelPart = w.level ? ' · ' + w.level : '';
          const tierPart = w.tier === 'theme'
            ? ` · тема ${w.theme || ''}`
            : w.tier && w.tier !== 'lesson'
              ? ` · ${w.tier}`
              : '';
          items.push({
            type: 'word',
            typeLabel: 'Слово',
            href,
            title: w.nl,
            sub: `${w.ru}${levelPart}${tierPart}`.trim(),
            search: `${w.nl} ${w.ru}`.toLowerCase(),
          });
        }
      }
    } catch {
      // ignore
    }

    this._searchCorpus = items;
    return items;
  },

  async openSearch() {
    if (this._searchOpen) return;
    this._searchOpen = true;
    const corpus = await this.buildSearchCorpus();

    const backdrop = document.createElement('div');
    backdrop.className = 'search-modal-backdrop';
    backdrop.innerHTML = `
      <div class="search-modal" role="dialog" aria-label="Глобальный поиск">
        <input type="text" class="search-modal-input" id="global-search-input"
          placeholder="Поиск: уроки, грамматика, слова..." autocomplete="off">
        <div class="search-modal-results" id="global-search-results"></div>
        <div class="search-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> навигация</span>
          <span><kbd>Enter</kbd> открыть</span>
          <span><kbd>Esc</kbd> закрыть</span>
        </div>
      </div>
    `;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeSearch();
    });

    document.body.appendChild(backdrop);
    this._searchBackdrop = backdrop;

    const input = backdrop.querySelector('#global-search-input');
    const results = backdrop.querySelector('#global-search-results');
    let filtered = [];
    let activeIndex = 0;

    const render = () => {
      if (filtered.length === 0) {
        results.innerHTML = '<div class="search-empty">Ничего не найдено</div>';
        return;
      }
      results.innerHTML = filtered.map((it, i) => `
        <a href="${it.href}" class="search-result${i === activeIndex ? ' active' : ''}" data-idx="${i}">
          <span class="sr-type">${it.typeLabel}</span>
          <span class="sr-title">${this.escapeHtml(it.title)}</span>
          <span class="sr-sub">${this.escapeHtml(it.sub)}</span>
        </a>
      `).join('');
    };

    const update = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        filtered = corpus.slice(0, 20);
      } else {
        const tokens = q.split(/\s+/).filter(Boolean);
        filtered = corpus
          .filter((it) => tokens.every((t) => it.search.includes(t)))
          .slice(0, 30);
      }
      activeIndex = 0;
      render();
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          this.closeSearch();
          location.hash = item.href;
        }
      }
    });

    results.addEventListener('click', (e) => {
      const a = e.target.closest('.search-result');
      if (!a) return;
      e.preventDefault();
      this.closeSearch();
      location.hash = a.getAttribute('href');
    });

    update();
    setTimeout(() => input.focus(), 0);
  },

  closeSearch() {
    if (!this._searchOpen) return;
    this._searchOpen = false;
    if (this._searchBackdrop) {
      this._searchBackdrop.remove();
      this._searchBackdrop = null;
    }
  },

  vocabSetPath(setId) {
    if (!setId) return null;
    if (/^[AB][12]-lesson-\d+$/.test(setId)) return `data/vocabulary/lessons/${setId}.json`;
    const m = setId.match(/^(core|extended)-([AB][12])$/);
    if (m) return `data/vocabulary/${m[1]}/${m[2]}.json`;
    const t = setId.match(/^themes-(.+)$/);
    if (t) return `data/vocabulary/themes/${t[1]}.json`;
    return `data/vocabulary/lessons/${setId}.json`;
  },

  async loadVocabSet(setId) {
    const p = this.vocabSetPath(setId);
    if (!p) return null;
    const data = await this.fetchJSON(p);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.words)) return data.words;
    return null;
  },

  async fetchJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`Failed to load ${path}:`, e);
      return null;
    }
  },

  setupNavigation() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    const materials = document.getElementById('nav-materials');

    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', e => {
        if (link.id === 'nav-search') {
          e.preventDefault();
          this.openSearch();
          this.closeNavDrawer();
          return;
        }
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return;
        e.preventDefault();
        location.hash = hash;
        this.closeNavDrawer();
        if (materials && materials.open) materials.open = false;
      });
    });

    if (burger && drawer) {
      burger.addEventListener('click', () => {
        drawer.classList.contains('open') ? this.closeNavDrawer() : this.openNavDrawer();
      });
    }

    if (scrim) {
      scrim.addEventListener('click', () => this.closeNavDrawer());
    }

    if (materials) {
      document.addEventListener('click', (e) => {
        if (!materials.open) return;
        if (materials.contains(e.target)) return;
        if (this.isMobileLayout()) return;
        materials.open = false;
      });
    }

    window.addEventListener('resize', () => {
      if (!this.isMobileLayout()) this.closeNavDrawer();
    });
  },

  isMobileLayout() {
    return window.matchMedia('(max-width: 860px)').matches;
  },

  openNavDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    if (!drawer || !burger) return;
    drawer.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    if (scrim) scrim.hidden = false;
  },

  closeNavDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    if (!drawer || !burger) return;
    drawer.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    if (scrim) scrim.hidden = true;
  },

  MATERIALS_PAGES: ['flashcards', 'verbs', 'reading', 'writing', 'culture', 'resources'],

  updateActiveNav(page) {
    const active = `#${page}`;
    document.querySelectorAll('nav a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === active);
    });
    const materialsTrigger = document.querySelector('#nav-materials .nav-group__trigger');
    if (materialsTrigger) {
      materialsTrigger.classList.toggle('active', this.MATERIALS_PAGES.includes(page));
    }
    this.updateHeaderStreak();
  },

  updateHeaderStreak() {
    const wrap = document.getElementById('nav-progress-streak');
    const value = document.getElementById('nav-progress-streak-value');
    if (!wrap || !value || !this.progress || !this.progress.data) return;
    const streak = this.progress.data.streak || 0;
    if (streak > 0) {
      value.textContent = String(streak);
      wrap.hidden = false;
    } else {
      wrap.hidden = true;
    }
  },

  route(hash) {
    const parts = hash.replace('#', '').split('/');
    const page = parts[0] || 'home';
    const param = parts[1] || null;

    this.updateActiveNav(page);

    const main = document.getElementById('main-content');
    main.innerHTML = '';
    main.classList.add('fade-in');
    setTimeout(() => main.classList.remove('fade-in'), 300);

    switch (page) {
      case 'home': this.renderHome(main); break;
      case 'lessons': param ? this.renderLesson(main, param) : this.renderLessons(main); break;
      case 'grammar': param ? this.renderGrammarTopic(main, param) : this.renderGrammar(main); break;
      case 'flashcards': this.renderFlashcards(main, param); break;
      case 'verbs': this.renderVerbs(main); break;
      case 'culture': param ? this.renderCultureArticle(main, param) : this.renderCulture(main); break;
      case 'tests': param ? this.renderTest(main, param) : this.renderTests(main); break;
      case 'progress': this.renderProgress(main); break;
      case 'reading': param ? this.renderReadingText(main, param) : this.renderReading(main); break;
      case 'writing': param ? this.renderWritingItem(main, param) : this.renderWriting(main); break;
      case 'resources': this.renderResources(main); break;
      default: this.renderHome(main);
    }

    this.currentPage = page;
  },

  renderPlaceholder(el, title, description) {
    el.innerHTML = this.pageHero(title, description, []);
  },

  pageHero(title, summary, pills) {
    const pillsHtml = (pills || [])
      .map((p) => `<span class="culture-pill${p.muted ? ' culture-pill--muted' : ''}">${this.escapeHtml(p.text)}</span>`)
      .join('');
    return `<div class="page-hero">
      <h1>${this.escapeHtml(title)}</h1>
      ${summary ? `<p class="page-hero__summary">${this.escapeHtml(summary)}</p>` : ''}
      ${pillsHtml ? `<div class="page-hero__meta">${pillsHtml}</div>` : ''}
    </div>`;
  },

  async renderReading(el) {
    el.innerHTML = this.pageHero('Чтение', 'Загружаем тексты…', []);
    try {
      if (!this._readingIndex) {
        this._readingIndex = await this.fetchJSON('data/reading/index.json');
      }
      const index = this._readingIndex;
      const read = new Set(this.progress.data.readingRead || []);

      let totalTexts = 0;
      for (const level of index.levels) {
        totalTexts += Array.isArray(level.texts) ? level.texts.length : 0;
      }

      let html = this.pageHero(
        'Чтение',
        'Градуированные тексты A1–B2 с глоссарием и вопросами. Уровни A1–A2 — бытовые ситуации, B1 — inburgering, B2 — NT2 Programma II.',
        [
          { text: `${totalTexts} текстов`, muted: false },
          { text: `${index.levels.length} уровней`, muted: true },
        ],
      );

      for (const level of index.levels) {
        if (!Array.isArray(level.texts) || level.texts.length === 0) continue;
        html += `<section class="page-section"><div class="page-section__head"><h2>${this.escapeHtml(level.titleRu || level.id)}</h2><span class="page-section__count">${level.texts.length}</span></div><div class="card-grid">`;
        for (const t of level.texts) {
          const done = read.has(t.id);
          html += `
            <a href="#reading/${t.id}" class="card" style="text-decoration:none;color:inherit">
              <span class="badge badge-${level.id.toLowerCase()}">${level.id}</span>
              ${done ? '<span class="badge" style="margin-left:.25rem">Прочитано</span>' : ''}
              <h3 style="margin-top:.5rem">${this.escapeHtml(t.title)}</h3>
              <p style="color:var(--text-muted);font-size:.85rem">
                ${this.escapeHtml(t.topic || '')} · ${this.escapeHtml(t.readingTime || '')}
              </p>
            </a>
          `;
        }
        html += '</div></section>';
      }

      el.innerHTML = html;
    } catch (err) {
      console.error('Failed to load reading index', err);
      el.innerHTML = `${this.pageHero('Чтение', 'Не удалось загрузить список текстов.', [])}`;
    }
  },

  async renderReadingText(el, id) {
    el.innerHTML = '<p style="color:var(--text-muted)">Загружаем текст...</p>';
    try {
      const text = await this.fetchJSON(`data/reading/${id}.json`);
      this._renderReadingTextView(el, text);
    } catch (err) {
      console.error('Failed to load reading text', id, err);
      el.innerHTML = `
        ${this.pageHero('Чтение', 'Не удалось загрузить текст.', [{ text: id, muted: true }])}
        <div class="card"><p>Код: <code>${this.escapeHtml(id)}</code></p>
        <p><a href="#reading" class="btn">Назад к списку</a></p></div>
      `;
    }
  },

  _renderReadingTextView(el, text) {
    const done = this.progress.isReadingRead(text.id);
    const paragraphs = (text.body || '')
      .split(/\n\s*\n/)
      .map((p) => `<p>${this.escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('');

    let glossaryHtml = '';
    if (Array.isArray(text.glossary) && text.glossary.length > 0) {
      glossaryHtml = `
        <h2>Глоссарий</h2>
        <div class="card">
          <table class="table">
            <thead><tr><th>Nederlands</th><th>Русский</th></tr></thead>
            <tbody>
              ${text.glossary
                .map(
                  (g) =>
                    `<tr><td>${this.escapeHtml(g.nl)}</td><td>${this.escapeHtml(g.ru)}</td></tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    let questionsHtml = '';
    if (Array.isArray(text.questions) && text.questions.length > 0) {
      questionsHtml = '<h2>Вопросы</h2><div class="card" id="reading-questions">';
      text.questions.forEach((q, idx) => {
        questionsHtml += `<div class="reading-q" data-idx="${idx}" data-answer="${q.answer}">
          <p style="font-weight:600">${idx + 1}. ${this.escapeHtml(q.q)}</p>
          <div class="reading-q-options" style="display:flex;flex-direction:column;gap:.4rem;margin:.5rem 0 1rem">`;
        q.options.forEach((opt, optIdx) => {
          questionsHtml += `<label style="display:flex;gap:.5rem;align-items:flex-start;cursor:pointer">
            <input type="radio" name="rq-${idx}" value="${optIdx}"> <span>${this.escapeHtml(opt)}</span>
          </label>`;
        });
        questionsHtml += `</div><div class="reading-q-feedback" style="font-size:.9rem"></div></div>`;
      });
      questionsHtml += `<button class="btn btn-primary" id="reading-check-btn">Проверить</button>
        <span id="reading-score" style="margin-left:1rem;color:var(--text-muted)"></span>
        </div>`;
    }

    const metaPills = [];
    if (text.readingTime) metaPills.push({ text: text.readingTime, muted: true });
    if (text.topic) metaPills.push({ text: text.topic, muted: true });
    const pillsHtml = metaPills
      .map((p) => `<span class="culture-pill culture-pill--muted">${this.escapeHtml(p.text)}</span>`)
      .join('');

    el.innerHTML = `
      <div class="breadcrumb"><a href="#reading">Чтение</a> / <span>${this.escapeHtml(text.title)}</span></div>
      <div class="page-hero page-hero--slim">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-${(text.level || '').toLowerCase()}">${this.escapeHtml(text.level || '')}</span>
        </div>
        <h1 class="culture-hero__title">${this.escapeHtml(text.title)}</h1>
        ${pillsHtml ? `<div class="page-hero__meta">${pillsHtml}</div>` : ''}
      </div>
      <div class="card reading-body" style="font-size:1.05rem;line-height:1.7">
        ${paragraphs}
      </div>
      ${glossaryHtml}
      ${questionsHtml}
      <div class="card" style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
        <button class="btn ${done ? '' : 'btn-primary'}" id="reading-toggle-btn">
          ${done ? 'Убрать отметку «прочитано»' : 'Отметить как прочитано'}
        </button>
        ${done ? '<span style="color:var(--text-muted);font-size:.9rem">Вы уже отметили этот текст как прочитанный.</span>' : ''}
      </div>
    `;

    const toggleBtn = document.getElementById('reading-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.progress.isReadingRead(text.id)) {
          this.progress.unmarkReadingRead(text.id);
        } else {
          this.progress.markReadingRead(text.id);
        }
        this._renderReadingTextView(el, text);
      });
    }

    const checkBtn = document.getElementById('reading-check-btn');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const qs = el.querySelectorAll('.reading-q');
        let correct = 0;
        qs.forEach((qEl) => {
          const answer = Number(qEl.dataset.answer);
          const idx = qEl.dataset.idx;
          const selected = qEl.querySelector(`input[name="rq-${idx}"]:checked`);
          const feedback = qEl.querySelector('.reading-q-feedback');
          if (!selected) {
            feedback.innerHTML = '<span style="color:var(--text-muted)">Не отвечено</span>';
            return;
          }
          const val = Number(selected.value);
          if (val === answer) {
            correct++;
            feedback.innerHTML = '<span style="color:var(--success, #16a34a)">Верно</span>';
          } else {
            feedback.innerHTML = `<span style="color:var(--error, #dc2626)">Неверно. Правильный ответ: ${this.escapeHtml(text.questions[Number(idx)].options[answer])}</span>`;
          }
        });
        const scoreEl = document.getElementById('reading-score');
        if (scoreEl) {
          scoreEl.textContent = `${correct} из ${text.questions.length}`;
        }
      });
    }
  },

  async renderWriting(el) {
    el.innerHTML = this.pageHero('Письмо', 'Загружаем справочник…', []);
    try {
      if (!this._writingIndex) {
        this._writingIndex = await this.fetchJSON('data/writing/index.json');
      }
      const index = this._writingIndex;
      const seen = new Set(this.progress.data.writingSeen || []);

      let itemCount = 0;
      for (const s of index.sections || []) {
        itemCount += Array.isArray(s.items) ? s.items.length : 0;
      }

      let html = this.pageHero(
        'Письмо',
        'Справочник по формальному и полуформальному письму: шаблоны email, задания NT2 и типовые «строительные блоки».',
        [
          { text: `${itemCount} материалов`, muted: false },
          { text: `${(index.sections || []).length} разделов`, muted: true },
        ],
      );

      for (const section of index.sections) {
        if (!Array.isArray(section.items) || section.items.length === 0) continue;
        html += `<section class="page-section"><div class="page-section__head"><h2>${this.escapeHtml(section.titleRu)} <span style="color:var(--text-muted);font-weight:400;font-size:.85rem">${this.escapeHtml(section.titleNl || '')}</span></h2><span class="page-section__count">${section.items.length}</span></div>`;
        html += '<div class="card-grid">';
        for (const item of section.items) {
          const done = seen.has(item.id);
          const typeLabelMap = {email: 'Email', model: 'Модель', reference: 'Справка'};
          const typeLabel = typeLabelMap[item.type] || item.type;
          html += `
            <a href="#writing/${item.id}" class="card" style="text-decoration:none;color:inherit">
              <span class="badge badge-${item.level.toLowerCase()}">${item.level}</span>
              <span class="badge" style="margin-left:.25rem">${this.escapeHtml(typeLabel)}</span>
              ${done ? '<span class="badge" style="margin-left:.25rem">Изучено</span>' : ''}
              <h3 style="margin-top:.5rem">${this.escapeHtml(item.title)}</h3>
            </a>
          `;
        }
        html += '</div></section>';
      }

      el.innerHTML = html;
    } catch (err) {
      console.error('Failed to load writing index', err);
      el.innerHTML = this.pageHero('Письмо', 'Не удалось загрузить справочник.', []);
    }
  },

  async renderWritingItem(el, id) {
    el.innerHTML = '<p style="color:var(--text-muted)">Загружаем материал...</p>';
    try {
      const item = await this.fetchJSON(`data/writing/${id}.json`);
      this._renderWritingItemView(el, item);
    } catch (err) {
      console.error('Failed to load writing item', id, err);
      el.innerHTML = `
        ${this.pageHero('Письмо', 'Не удалось загрузить материал.', [{ text: id, muted: true }])}
        <div class="card"><p><a href="#writing" class="btn">Назад к списку</a></p></div>
      `;
    }
  },

  _renderWritingItemView(el, item) {
    const seen = this.progress.data.writingSeen || [];
    const isSeen = seen.includes(item.id);

    let structureHtml = '';
    if (Array.isArray(item.structure) && item.structure.length > 0) {
      structureHtml = '<h2>Структура</h2><div class="card"><ol style="margin:0;padding-left:1.25rem">';
      for (const s of item.structure) {
        structureHtml += `<li style="margin-bottom:.5rem"><strong>${this.escapeHtml(s.title)}</strong>${s.note ? ' — ' + this.escapeHtml(s.note) : ''}</li>`;
      }
      structureHtml += '</ol></div>';
    }

    let phrasesHtml = '';
    if (Array.isArray(item.phrases) && item.phrases.length > 0) {
      phrasesHtml = '<h2>Полезные фразы</h2><div class="card"><ul style="margin:0;padding-left:1.25rem">';
      for (const p of item.phrases) {
        phrasesHtml += `<li style="margin-bottom:.4rem">${this.escapeHtml(p).replace(/\n/g, '<br>')}</li>`;
      }
      phrasesHtml += '</ul></div>';
    }

    let modelHtml = '';
    if (item.model) {
      const paragraphs = item.model
        .split(/\n\s*\n/)
        .map((p) => `<p>${this.escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
      modelHtml = `<h2>Модельный ответ</h2><div class="card" style="font-family:var(--font-mono, monospace);line-height:1.6">${paragraphs}</div>`;
    }

    let tipsHtml = '';
    if (Array.isArray(item.tips) && item.tips.length > 0) {
      tipsHtml = '<h2>Подсказки</h2><div class="card"><ul style="margin:0;padding-left:1.25rem">';
      for (const t of item.tips) {
        tipsHtml += `<li style="margin-bottom:.4rem">${this.escapeHtml(t)}</li>`;
      }
      tipsHtml += '</ul></div>';
    }

    const typeLabelMap = {email: 'Email', model: 'Модель', reference: 'Справка'};
    const typeLabel = typeLabelMap[item.type] || item.type || '';

    const wPills = [];
    if (typeLabel) wPills.push({ text: typeLabel, muted: true });
    if (item.titleRu) wPills.push({ text: item.titleRu, muted: true });
    const wPillsHtml = wPills
      .map((p) => `<span class="culture-pill culture-pill--muted">${this.escapeHtml(p.text)}</span>`)
      .join('');

    el.innerHTML = `
      <div class="breadcrumb"><a href="#writing">Письмо</a> / <span>${this.escapeHtml(item.title)}</span></div>
      <div class="page-hero page-hero--slim">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          ${item.level ? `<span class="badge badge-${item.level.toLowerCase()}">${this.escapeHtml(item.level)}</span>` : ''}
        </div>
        <h1 class="culture-hero__title">${this.escapeHtml(item.title)}</h1>
        ${wPillsHtml ? `<div class="page-hero__meta">${wPillsHtml}</div>` : ''}
      </div>
      ${item.description ? `<p style="color:var(--text-muted);margin:0 0 1rem;line-height:1.55">${this.escapeHtml(item.description)}</p>` : ''}
      ${structureHtml}
      ${phrasesHtml}
      ${modelHtml}
      ${tipsHtml}
      <div class="card" style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center">
        <button class="btn ${isSeen ? '' : 'btn-primary'}" id="writing-toggle-btn">
          ${isSeen ? 'Убрать отметку «изучено»' : 'Отметить как изучено'}
        </button>
      </div>
    `;

    const btn = document.getElementById('writing-toggle-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const list = this.progress.data.writingSeen || [];
        if (list.includes(item.id)) {
          this.progress.data.writingSeen = list.filter((x) => x !== item.id);
        } else {
          list.push(item.id);
          this.progress.data.writingSeen = list;
        }
        this.progress.updateStreak();
        this.progress.save();
        this._renderWritingItemView(el, item);
      });
    }
  },

  resourceLevelBadgeClass(level) {
    if (!level) return 'badge';
    const s = String(level).toLowerCase();
    if (/\bknm\b/i.test(s)) return 'badge badge-knm';
    if (/^all$/i.test(s.trim())) return 'badge badge-all';
    if (/\bb2\b|b2-/i.test(s) || /-b2\b/i.test(s)) return 'badge badge-b2';
    if (/\bb1\b|b1-/i.test(s) || /-b1\b/i.test(s)) return 'badge badge-b1';
    if (/\ba2\b|a2-/i.test(s) || /-a2\b/i.test(s)) return 'badge badge-a2';
    if (/\ba1\b|a1-/i.test(s) || /-a1\b/i.test(s)) return 'badge badge-a1';
    return 'badge badge-resource';
  },

  async renderResources(el) {
    el.innerHTML = this.pageHero('Ресурсы', 'Загружаем подборку…', []);
    try {
      if (!this._resourcesIndex) {
        this._resourcesIndex = await this.fetchJSON('data/resources/index.json');
      }
      const index = this._resourcesIndex;
      const sections = (index.sections || []).filter((s) => Array.isArray(s.items) && s.items.length > 0);
      const totalItems = sections.reduce((n, s) => n + s.items.length, 0);

      let html = this.pageHero(
        'Ресурсы',
        'Подборка внешних материалов: подкасты, новости, видео, приложения и справочники. Все ссылки открываются в новой вкладке.',
        [
          { text: `${totalItems} ссылок`, muted: false },
          { text: `${sections.length} разделов`, muted: true },
          { text: 'Уровни A1–B2', muted: true },
        ],
      );

      for (const section of sections) {
        html += `
          <section class="page-section">
            <div class="page-section__head">
              <h2>${this.escapeHtml(section.titleRu)}
                <span style="color:var(--text-muted);font-weight:400;font-size:.85rem"> ${this.escapeHtml(section.titleNl || '')}</span>
              </h2>
              <span class="page-section__count">${section.items.length}</span>
            </div>
        `;
        if (section.description) {
          html += `<p class="page-section__desc">${this.escapeHtml(section.description)}</p>`;
        }
        html += '<div class="card-grid">';
        for (const r of section.items) {
          const lvl = r.level ? `<span class="${this.resourceLevelBadgeClass(r.level)}">${this.escapeHtml(r.level)}</span>` : '';
          html += `
            <a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="resource-card link-external" title="Открывается в новой вкладке">
              ${lvl}
              <h3 class="resource-card__title">${this.escapeHtml(r.title)}</h3>
              ${r.note ? `<p class="resource-card__summary">${this.escapeHtml(r.note)}</p>` : ''}
            </a>
          `;
        }
        html += '</div></section>';
      }

      el.innerHTML = html;
    } catch (err) {
      console.error('Failed to load resources index', err);
      el.innerHTML = this.pageHero('Ресурсы', 'Не удалось загрузить подборку.', []);
    }
  },

  allLessonsFlat() {
    const all = [];
    if (!this.lessonsIndex) return all;
    for (const lv of this.lessonsIndex.levels) {
      lv.lessons.forEach((l, idx) => {
        all.push({ ...l, level: lv.id, levelPos: idx + 1, levelTotal: lv.lessons.length });
      });
    }
    return all;
  },

  lessonPosition(lessonId) {
    const all = this.allLessonsFlat();
    return all.find((l) => l.id === lessonId) || null;
  },

  findNextLesson() {
    const all = this.allLessonsFlat();
    if (all.length === 0) return null;
    const completed = new Set(this.progress.data.lessonsCompleted || []);
    const next = all.find((l) => !completed.has(l.id));
    return next || all[all.length - 1];
  },

  levelProgressData() {
    if (!this.lessonsIndex) return [];
    const completed = new Set(this.progress.data.lessonsCompleted || []);
    return this.lessonsIndex.levels.map((lv) => {
      const total = lv.lessons.length;
      const done = lv.lessons.filter((l) => completed.has(l.id)).length;
      return {
        id: lv.id,
        title: lv.title || lv.titleRu || lv.id,
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  },

  renderHome(el) {
    const stats = this.progress.getStats();
    const totalGrammar = this.grammarIndex ? Object.keys(this.grammarIndex.topics).length : 0;
    const totalLessons = this.allLessonsFlat().length;
    const totalWords = this.vocabIndex ? this.vocabIndex.totalWords : 0;
    const dueCount = SRS.getDueCount(this.progress.data);
    const next = this.findNextLesson();

    const continueHtml = next
      ? `
        <div class="continue-card">
          <div>
            <div style="color:var(--text-muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em">Продолжить</div>
            <div style="font-size:1.1rem;font-weight:600;margin-top:.25rem">${next.title}</div>
            <div style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">${next.level} · Урок ${next.levelPos} из ${next.levelTotal}</div>
          </div>
          <a href="#lessons/${next.id}" class="btn btn-primary">Открыть</a>
        </div>
      `
      : `
        <div class="continue-card">
          <div>
            <div style="color:var(--text-muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em">Все уроки пройдены</div>
            <div style="font-size:1.1rem;font-weight:600;margin-top:.25rem">Отличная работа!</div>
            <div style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">Продолжайте повторение и тесты</div>
          </div>
          <a href="#flashcards/review" class="btn btn-primary">Повторять</a>
        </div>
      `;

    const planItems = [];
    if (dueCount > 0) {
      planItems.push(`
        <div class="today-plan-item">
          <div class="tp-icon">SRS</div>
          <div style="font-weight:600">Повторение карточек</div>
          <div style="color:var(--text-muted);font-size:.85rem">${dueCount} карточек готовы к повтору</div>
          <a href="#flashcards/review" class="btn btn-primary" style="margin-top:auto">Начать</a>
        </div>
      `);
    }
    if (next) {
      planItems.push(`
        <div class="today-plan-item">
          <div class="tp-icon">${next.level}</div>
          <div style="font-weight:600">Новый урок</div>
          <div style="color:var(--text-muted);font-size:.85rem">${next.title}</div>
          <a href="#lessons/${next.id}" class="btn btn-secondary" style="margin-top:auto">К уроку</a>
        </div>
      `);
    }
    if (totalGrammar > stats.grammarViewed) {
      planItems.push(`
        <div class="today-plan-item">
          <div class="tp-icon">ГР</div>
          <div style="font-weight:600">Грамматика</div>
          <div style="color:var(--text-muted);font-size:.85rem">${stats.grammarViewed}/${totalGrammar} тем изучено</div>
          <a href="#grammar" class="btn btn-secondary" style="margin-top:auto">Открыть</a>
        </div>
      `);
    }
    const planHtml = planItems.length > 0
      ? `<section class="page-section" style="margin-top:1.5rem"><div class="page-section__head"><h2>План на сегодня</h2><span class="page-section__count">${planItems.length}</span></div><div class="today-plan">${planItems.join('')}</div></section>`
      : '';

    const miniStats = `
      <div class="home-stripe">
        <div class="hs-item"><span class="hs-value">${stats.streak}</span><span class="hs-label">дней подряд</span></div>
        <div class="hs-sep"></div>
        <div class="hs-item"><span class="hs-value">${dueCount}</span><span class="hs-label">карточек к повтору</span></div>
        <div class="hs-sep"></div>
        <div class="hs-item"><span class="hs-value">${stats.correctRate}%</span><span class="hs-label">точность</span></div>
        <a href="#progress" class="hs-link">Подробная статистика →</a>
      </div>
    `;

    el.innerHTML = `
      ${this.pageHero(
        'Dutch Learning System',
        `A1 → B2 · Inburgering · ${totalLessons} уроков, ${totalGrammar} тем грамматики, ${totalWords} слов`,
        [
          { text: `${stats.streak} дн. подряд`, muted: true },
          { text: dueCount > 0 ? `${dueCount} к повтору` : 'SRS в норме', muted: dueCount === 0 },
        ],
      )}
      ${continueHtml}
      ${miniStats}
      ${planHtml}

      <section class="page-section">
        <div class="page-section__head">
          <h2>Разделы</h2>
          <span class="page-section__count">6</span>
        </div>
        <div class="card-grid">
        <a href="#lessons" class="card" style="text-decoration:none;color:inherit">
          <h3>Уроки</h3>
          <p style="color:var(--text-muted);font-size:.875rem">${totalLessons} уроков от A1 до B2</p>
        </a>
        <a href="#grammar" class="card" style="text-decoration:none;color:inherit">
          <h3>Грамматика</h3>
          <p style="color:var(--text-muted);font-size:.875rem">${totalGrammar} тем A1–B2</p>
        </a>
        <a href="#flashcards" class="card" style="text-decoration:none;color:inherit">
          <h3>Флеш-карточки</h3>
          <p style="color:var(--text-muted);font-size:.875rem">${totalWords} слов с SRS${dueCount > 0 ? ` · <span style="color:var(--accent)">${dueCount} к повтору</span>` : ''}</p>
        </a>
        <a href="#verbs" class="card" style="text-decoration:none;color:inherit">
          <h3>Неправильные глаголы</h3>
          <p style="color:var(--text-muted);font-size:.875rem">Справочник с поиском и практиками</p>
        </a>
        <a href="#culture" class="card" style="text-decoration:none;color:inherit">
          <h3>Культура</h3>
          <p style="color:var(--text-muted);font-size:.875rem">Жизнь в Нидерландах и Inburgering</p>
        </a>
        <a href="#tests" class="card" style="text-decoration:none;color:inherit">
          <h3>Тесты</h3>
          <p style="color:var(--text-muted);font-size:.875rem">A1, A2, B1, B2</p>
        </a>
      </div>
      </section>
    `;
  },

  renderGrammar(el) {
    if (!this.grammarIndex) {
      el.innerHTML = this.pageHero('\u0413\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0430', '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0438\u043d\u0434\u0435\u043a\u0441 \u0442\u0435\u043c.', []);
      return;
    }

    const { categories, topics } = this.grammarIndex;

    const topicCount = Object.keys(topics).length;
    el.innerHTML = `
      ${this.pageHero(
        '\u0413\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0441\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a',
        '\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0442\u0435\u043c\u0430\u043c \u0438 \u0444\u0438\u043b\u044c\u0442\u0440 \u043f\u043e \u0443\u0440\u043e\u0432\u043d\u044e A1\u2013B2.',
        [
          { text: `${topicCount} \u0442\u0435\u043c`, muted: false },
          { text: `${categories.length} \u0440\u0430\u0437\u0434\u0435\u043b\u043e\u0432`, muted: true },
        ],
      )}
      <input type="text" class="search-box" id="grammar-search"
        placeholder="\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0442\u0435\u043c\u0430\u043c..." style="margin-bottom:1rem">
      <div class="tag-list" id="level-filter">
        <span class="tag active" data-level="all">\u0412\u0441\u0435</span>
        <span class="tag" data-level="A1">A1</span>
        <span class="tag" data-level="A2">A2</span>
        <span class="tag" data-level="B1">B1</span>
        <span class="tag" data-level="B2">B2</span>
      </div>
      <div id="grammar-list"></div>
    `;

    this.renderGrammarList(categories, topics, 'all', '');

    document.getElementById('grammar-search').addEventListener('input', e => {
      const activeLevel = document.querySelector('#level-filter .tag.active').dataset.level;
      this.renderGrammarList(categories, topics, activeLevel, e.target.value);
    });

    document.getElementById('level-filter').addEventListener('click', e => {
      if (!e.target.classList.contains('tag')) return;
      document.querySelectorAll('#level-filter .tag').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      const query = document.getElementById('grammar-search').value;
      this.renderGrammarList(categories, topics, e.target.dataset.level, query);
    });
  },

  renderGrammarList(categories, topics, level, query) {
    const container = document.getElementById('grammar-list');
    const q = query.toLowerCase();

    let html = '';
    for (const cat of categories) {
      const topicIds = cat.topicIds || cat.topics || [];
      const filteredTopics = topicIds.filter(id => {
        const t = topics[id];
        if (!t) return false;
        if (level !== 'all' && t.level !== level) return false;
        if (q && !t.title.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return false;
        return true;
      });

      if (filteredTopics.length === 0) continue;

      html += `<section class="page-section"><div class="page-section__head"><h2>${this.escapeHtml(cat.name || cat.title)}</h2><span class="page-section__count">${filteredTopics.length}</span></div><div class="card-grid">`;
      for (const id of filteredTopics) {
        const t = topics[id];
        const viewed = this.progress.isGrammarViewed(id);
        html += `
          <a href="#grammar/${id}" class="card" style="text-decoration:none;color:inherit">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
              <span class="badge badge-${t.level.toLowerCase()}">${t.level}</span>
              ${viewed ? '<span style="color:var(--green)">&#10003;</span>' : ''}
            </div>
            <h3>${this.escapeHtml(t.title)}</h3>
          </a>
        `;
      }
      html += '</div></section>';
    }

    container.innerHTML = html || '<p style="color:var(--text-muted)">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</p>';
  },

  async renderGrammarTopic(el, topicId) {
    const meta = this.grammarIndex?.topics[topicId];
    if (!meta) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#grammar">\u0413\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0430</a> / <span>\u041e\u0448\u0438\u0431\u043a\u0430</span></div>
        ${this.pageHero('\u0422\u0435\u043c\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430', '\u0412\u0435\u0440\u043d\u0438\u0441\u044c \u043a \u0441\u043f\u0438\u0441\u043a\u0443 \u0442\u0435\u043c.', [{ text: topicId, muted: true }])}
        <p style="margin-top:1rem"><a href="#grammar" class="btn btn-primary">\u041a \u0433\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0435</a></p>
      `;
      return;
    }

    if (!this.grammarTopics[topicId]) {
      this.grammarTopics[topicId] = await this.fetchJSON(`data/grammar/${meta.file}`);
    }

    const topic = this.grammarTopics[topicId];
    if (!topic) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#grammar">\u0413\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0430</a> / <span>\u041e\u0448\u0438\u0431\u043a\u0430</span></div>
        ${this.pageHero('\u0422\u0435\u043c\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430', '\u0412\u0435\u0440\u043d\u0438\u0441\u044c \u043a \u0441\u043f\u0438\u0441\u043a\u0443 \u0442\u0435\u043c.', [{ text: topicId, muted: true }])}
        <p style="margin-top:1rem"><a href="#grammar" class="btn btn-primary">\u041a \u0433\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0435</a></p>
      `;
      return;
    }

    this.progress.markGrammarViewed(topicId);

    let html = `
      <div class="breadcrumb">
        <a href="#grammar">\u0413\u0440\u0430\u043c\u043c\u0430\u0442\u0438\u043a\u0430</a> / <span>${this.escapeHtml(topic.title)}</span>
      </div>
      <div class="page-hero page-hero--slim">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-${topic.level.toLowerCase()}">${this.escapeHtml(topic.level)}</span>
        </div>
        <h1 class="culture-hero__title">${this.escapeHtml(topic.title)}</h1>
        ${topic.titleNL ? `<div class="page-hero__meta"><span class="culture-pill culture-pill--muted">${this.escapeHtml(topic.titleNL)}</span></div>` : ''}
      </div>
      <p style="margin-bottom:1.5rem;line-height:1.6">${this.escapeHtml(topic.summary || '')}</p>
    `;

    if (topic.rule) {
      html += `
        <div class="grammar-rule">
          <p><strong>\u0424\u043e\u0440\u043c\u0443\u043b\u0430:</strong> <code>${topic.rule.formula}</code></p>
          <p style="margin-top:.5rem">${topic.rule.explanation}</p>
        </div>
      `;
      if (topic.rule.whenToUse) {
        html += '<ul style="margin:1rem 0;padding-left:1.5rem">';
        for (const item of topic.rule.whenToUse) {
          html += `<li style="margin-bottom:.25rem">${item}</li>`;
        }
        html += '</ul>';
      }
    }

    if (topic.tables && topic.tables.length > 0) {
      for (const tbl of topic.tables) {
        html += `<h3 style="margin-top:1.5rem">${tbl.title}</h3><table>`;
        if (tbl.headers) {
          html += '<thead><tr>';
          for (const h of tbl.headers) html += `<th>${h}</th>`;
          html += '</tr></thead>';
        }
        html += '<tbody>';
        for (const row of tbl.rows) {
          html += '<tr>';
          for (const cell of row) html += `<td>${cell}</td>`;
          html += '</tr>';
        }
        html += '</tbody></table>';
      }
    }

    if (topic.examples && topic.examples.length > 0) {
      html += '<h3 style="margin-top:1.5rem">\u041f\u0440\u0438\u043c\u0435\u0440\u044b</h3>';
      for (const ex of topic.examples) {
        html += `
          <div class="example">
            <span class="example-nl">${ex.nl}</span>
            <span class="example-ru">${ex.ru}</span>
          </div>
        `;
      }
    }

    if (topic.tips && topic.tips.length > 0) {
      html += '<h3 style="margin-top:1.5rem">\u0421\u043e\u0432\u0435\u0442\u044b</h3>';
      for (const tip of topic.tips) {
        if (typeof tip === 'string') {
          html += `<ul style="padding-left:1.5rem;margin-bottom:.5rem"><li>${tip}</li></ul>`;
        } else if (tip && typeof tip === 'object') {
          html += `<div style="margin-bottom:1rem">`;
          if (tip.title) html += `<p style="font-weight:600;margin-bottom:.35rem">${tip.title}</p>`;
          if (Array.isArray(tip.items) && tip.items.length) {
            html += '<ul style="padding-left:1.5rem;margin:0">';
            for (const it of tip.items) html += `<li style="margin-bottom:.25rem">${it}</li>`;
            html += '</ul>';
          }
          html += '</div>';
        }
      }
    }

    if (topic.exceptions && topic.exceptions.length > 0) {
      html += '<h3 style="margin-top:1.5rem">\u0418\u0441\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f \u0438 \u043d\u044e\u0430\u043d\u0441\u044b</h3><ul style="padding-left:1.5rem">';
      for (const ex of topic.exceptions) {
        html += `<li style="margin-bottom:.35rem">${ex}</li>`;
      }
      html += '</ul>';
    }

    if (topic.commonMistakes && topic.commonMistakes.length > 0) {
      html += '<h3 style="margin-top:1.5rem">\u0427\u0430\u0441\u0442\u044b\u0435 \u043e\u0448\u0438\u0431\u043a\u0438</h3>';
      for (const m of topic.commonMistakes) {
        html += `
          <div class="exercise-item">
            <p><span style="color:var(--red)">&#10007;</span> ${m.wrong}</p>
            <p><span style="color:var(--green)">&#10003;</span> ${m.correct}</p>
            <p style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">${m.why}</p>
          </div>
        `;
      }
    }

    if (topic.exercises && topic.exercises.length > 0) {
      html += '<h3 style="margin-top:1.5rem">\u0423\u043f\u0440\u0430\u0436\u043d\u0435\u043d\u0438\u044f</h3>';
      html += `<div id="exercises-container" data-topic="${topicId}">`;
      topic.exercises.forEach((ex, i) => {
        html += this.renderExercise(ex, i, topicId);
      });
      html += '</div>';
      html += `<div style="margin-top:1rem">
        <button class="btn btn-primary" onclick="App.checkAllExercises('${topicId}')">\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0432\u0441\u0435</button>
      </div>`;
    }

    const relatedLessons = this.findLessonsForGrammar(topic);
    if (relatedLessons.length > 0) {
      html += '<h3 style="margin-top:2rem">Изучается в уроках</h3><div class="related-links">';
      for (const lsn of relatedLessons) {
        html += `<a href="#lessons/${lsn.id}">${lsn.level} · Урок ${lsn.num} — ${lsn.title}</a>`;
      }
      html += '</div>';
    }

    if (topic.relatedTopics && topic.relatedTopics.length > 0) {
      html += '<h3 style="margin-top:2rem">Связанные темы</h3><div style="display:flex;flex-wrap:wrap;gap:.5rem">';
      for (const rt of topic.relatedTopics) {
        const rtMeta = this.grammarIndex.topics[rt];
        if (rtMeta) {
          html += `<a href="#grammar/${rt}" class="btn btn-secondary">${rtMeta.title}</a>`;
        }
      }
      html += '</div>';
    }

    el.innerHTML = html;
  },

  normalizeAnswer(s) {
    return String(s ?? '')
      .toLowerCase()
      .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
      .replace(/[.,!?;:]+\s*$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  renderExercise(ex, index, topicId) {
    const id = `ex-${topicId}-${index}`;
    const type = ex.type || 'text';
    const prompt = ex.question || ex.sentence || '';
    const promptHtml = this.escapeHtml(prompt);
    const answerAttr = this.escapeHtml(String(ex.answer ?? ''));
    const explanationAttr = this.escapeHtml(ex.explanation || '');
    const header = `<p style="margin-bottom:.5rem"><strong>${index + 1}.</strong> ${promptHtml}</p>`;

    if ((type === 'choice' || type === 'multiple-choice') && Array.isArray(ex.options)) {
      const optionsHtml = ex.options.map(opt => {
        const safe = this.escapeHtml(opt);
        return `
          <label style="display:flex;align-items:flex-start;gap:.5rem;padding:.375rem 0;cursor:pointer">
            <input type="radio" name="${id}" value="${safe}" style="margin-top:.3rem">
            <span>${safe}</span>
          </label>
        `;
      }).join('');
      return `
        <div class="exercise-item" data-answer="${answerAttr}" data-explanation="${explanationAttr}" data-type="choice" data-index="${index}">
          ${header}
          ${optionsHtml}
          <div class="exercise-feedback" id="fb-${id}"></div>
        </div>
      `;
    }

    if (type === 'fill-blank' || type === 'fill-in') {
      return `
        <div class="exercise-item" data-answer="${answerAttr}" data-explanation="${explanationAttr}" data-type="fill-blank" data-index="${index}">
          ${header}
          <input type="text" class="exercise-input" id="input-${id}" placeholder="Твой ответ..." autocomplete="off" autocapitalize="off" spellcheck="false">
          <div class="exercise-feedback" id="fb-${id}"></div>
        </div>
      `;
    }

    if (type === 'word-order' && Array.isArray(ex.words)) {
      const chipsHtml = ex.words.map(w => `<button type="button" class="word-chip" data-target="input-${id}">${this.escapeHtml(w)}</button>`).join('');
      return `
        <div class="exercise-item" data-answer="${answerAttr}" data-explanation="${explanationAttr}" data-type="word-order" data-index="${index}">
          <p style="margin-bottom:.5rem"><strong>${index + 1}.</strong> Составь предложение из слов:</p>
          <div class="word-chips">${chipsHtml}</div>
          <div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem">
            <input type="text" class="exercise-input" id="input-${id}" placeholder="Порядок слов..." autocomplete="off" autocapitalize="off" spellcheck="false">
            <button type="button" class="btn btn-secondary" onclick="App.clearInput('input-${id}')">Очистить</button>
          </div>
          <div class="exercise-feedback" id="fb-${id}"></div>
        </div>
      `;
    }

    return `
      <div class="exercise-item" data-index="${index}">
        ${header}
        ${ex.explanation ? `<p style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">${this.escapeHtml(ex.explanation)}</p>` : ''}
      </div>
    `;
  },

  clearInput(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
      el.value = '';
      el.classList.remove('correct', 'incorrect');
      el.focus();
    }
  },

  appendWordToInput(inputId, word) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const current = el.value.replace(/\s+$/, '');
    el.value = current ? `${current} ${word}` : word;
    el.focus();
  },

  checkAllExercises(topicId) {
    const container = document.getElementById('exercises-container');
    if (!container) return;

    let correct = 0;
    let total = 0;
    let unanswered = 0;

    container.querySelectorAll('.exercise-item').forEach(item => {
      const type = item.dataset.type;
      const answer = item.dataset.answer;
      const explanation = item.dataset.explanation || '';
      const fbEl = item.querySelector('.exercise-feedback');

      if (!type || answer === undefined || answer === '' || !fbEl) return;

      let userAnswer = '';
      let interacted = false;

      if (type === 'choice' || type === 'multiple-choice') {
        const checked = item.querySelector('input[type="radio"]:checked');
        userAnswer = checked ? checked.value : '';
        interacted = !!checked;
      } else if (type === 'fill-blank' || type === 'fill-in' || type === 'word-order') {
        const input = item.querySelector('.exercise-input');
        userAnswer = input ? input.value : '';
        interacted = userAnswer.trim().length > 0;
      } else {
        return;
      }

      total++;

      fbEl.classList.add('show');
      fbEl.classList.remove('correct', 'incorrect', 'neutral');

      if (!interacted) {
        unanswered++;
        fbEl.classList.add('incorrect');
        fbEl.innerHTML = `Нет ответа. Правильный: <strong>${this.escapeHtml(answer)}</strong>${explanation ? `. ${this.escapeHtml(explanation)}` : ''}`;
      } else {
        const isCorrect = this.normalizeAnswer(userAnswer) === this.normalizeAnswer(answer);
        if (isCorrect) {
          correct++;
          fbEl.classList.add('correct');
          fbEl.innerHTML = `Правильно!${explanation ? ` <span style="opacity:.85">— ${this.escapeHtml(explanation)}</span>` : ''}`;
        } else {
          fbEl.classList.add('incorrect');
          fbEl.innerHTML = `Неправильно. Правильный ответ: <strong>${this.escapeHtml(answer)}</strong>${explanation ? `. ${this.escapeHtml(explanation)}` : ''}`;
        }
        if (type !== 'choice' && type !== 'multiple-choice') {
          const input = item.querySelector('.exercise-input');
          if (input) {
            input.classList.remove('correct', 'incorrect');
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
          }
        }
      }
    });

    if (total > 0) {
      this.progress.recordExercise(topicId, correct, total);
      const toastType = correct === total ? 'success' : 'error';
      const suffix = unanswered > 0 ? ` (без ответа: ${unanswered})` : '';
      this.showToast(`${correct} из ${total} правильно${suffix}`, toastType);
    }
  },

  renderLessons(el) {
    if (!this.lessonsIndex) {
      el.innerHTML = this.pageHero('Уроки', 'Не удалось загрузить список уроков.', []);
      return;
    }

    const totalLessons = this.allLessonsFlat().length;
    const wc = this.vocabIndex ? this.vocabIndex.totalWords : '?';
    let html = this.pageHero(
      'Уроки',
      `${totalLessons} уроков от A1 до B2. Словарь: ${wc} слов.`,
      [
        { text: `${this.lessonsIndex.levels.length} уровней`, muted: true },
        { text: `${totalLessons} уроков`, muted: false },
      ],
    );

    for (const level of this.lessonsIndex.levels) {
      html += `<section class="page-section"><div class="page-section__head"><h2>${this.escapeHtml(level.title)}</h2><span class="page-section__count">${level.lessons.length}</span></div><div class="card-grid">`;
      level.lessons.forEach((lesson, idx) => {
        const vocabKey = lesson.id;
        const vocabInfo = this.vocabIndex?.lessons?.find(l => l.id === vocabKey);
        const wordCount = vocabInfo ? vocabInfo.wordCount : 0;
        const completed = this.progress.isLessonCompleted(lesson.id);
        const pos = idx + 1;

        html += `
          <a href="#lessons/${lesson.id}" class="card" style="text-decoration:none;color:inherit">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
              <span class="badge badge-${level.id.toLowerCase()}">${level.id} · Урок ${pos}</span>
              <span style="font-size:.75rem;color:var(--text-muted)">
                ${completed ? '<span class="completed-mark">&#10003;</span> ' : ''}${lesson.sectionCount} секций
              </span>
            </div>
            <h3>${lesson.title}</h3>
            ${wordCount > 0 ? `<p style="color:var(--text-muted);font-size:.8rem;margin-top:.25rem">${wordCount} слов</p>` : ''}
          </a>
        `;
      });
      html += '</div></section>';
    }

    el.innerHTML = html;
  },

  findRelatedGrammarForLesson(lessonNum) {
    if (!this.grammarIndex) return [];
    const out = [];
    for (const [id, topic] of Object.entries(this.grammarIndex.topics)) {
      const inLessons = Array.isArray(topic.inLessons) ? topic.inLessons : [];
      if (inLessons.includes(lessonNum)) {
        out.push({ id, title: topic.title, level: topic.level });
      }
    }
    return out;
  },

  findLessonsForGrammar(topic) {
    const inLessons = Array.isArray(topic.inLessons) ? topic.inLessons : [];
    if (inLessons.length === 0 || !this.lessonsIndex) return [];
    const all = this.allLessonsFlat();
    return inLessons
      .map((num) => all.find((l) => l.num === num))
      .filter(Boolean);
  },

  async renderLesson(el, lessonId) {
    const data = await this.fetchJSON(`data/lessons/${lessonId}.json`);
    if (!data) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#lessons">Уроки</a> / <span>Не найдено</span></div>
        ${this.pageHero('Урок не найден', 'Проверь ссылку или вернись к списку.', [{ text: lessonId, muted: true }])}
        <p style="margin-top:1rem"><a href="#lessons" class="btn btn-primary">К урокам</a></p>
      `;
      return;
    }

    const completed = this.progress.isLessonCompleted(lessonId);
    const relatedGrammar = this.findRelatedGrammarForLesson(data.num);
    const posInfo = this.lessonPosition(lessonId);
    const posLabel = posInfo ? `Урок ${posInfo.levelPos} из ${posInfo.levelTotal}` : `Урок ${data.num}`;

    let html = `
      <div class="breadcrumb">
        <a href="#lessons">Уроки</a> / <span>${this.escapeHtml(data.level)} · ${this.escapeHtml(posLabel)}</span>
      </div>
      <div class="page-hero page-hero--slim">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-${data.level.toLowerCase()}">${this.escapeHtml(data.level)}</span>
          <span id="lesson-status-pill-${lessonId}">${completed ? '<span class="culture-pill">Пройдено</span>' : ''}</span>
        </div>
        <h1 class="culture-hero__title">${this.escapeHtml(data.title)}</h1>
      </div>
    `;

    if (relatedGrammar.length > 0) {
      html += '<div class="related-links" style="margin-bottom:1rem">';
      for (const r of relatedGrammar) {
        html += `<a href="#grammar/${r.id}">${r.title}</a>`;
      }
      html += '</div>';
    }

    if (data.objectives && data.objectives.length > 0) {
      html += '<div class="card" style="margin:1rem 0"><h3>\u0426\u0435\u043b\u0438 \u0443\u0440\u043e\u043a\u0430</h3><ul style="padding-left:1.25rem;margin-top:.5rem">';
      for (const obj of data.objectives) {
        html += `<li style="margin-bottom:.25rem">${obj}</li>`;
      }
      html += '</ul></div>';
    }

    for (const sec of data.sections) {
      html += this.renderLessonSection(sec);
    }

    const allLessons = this.allLessonsFlat();
    const idx = allLessons.findIndex(l => l.id === lessonId);

    let isLastOfLevel = false;
    if (this.lessonsIndex) {
      const lv = this.lessonsIndex.levels.find((x) => x.id === data.level);
      if (lv && lv.lessons.length > 0) {
        isLastOfLevel = lv.lessons[lv.lessons.length - 1].id === lessonId;
      }
    }

    if (isLastOfLevel) {
      html += `
        <div class="card" style="margin-top:2rem;border-color:var(--accent);text-align:center">
          <h3>\u0423\u0440\u043e\u0432\u0435\u043d\u044c ${data.level} \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d!</h3>
          <p style="color:var(--text-muted);margin:.5rem 0">\u041f\u0440\u043e\u0439\u0434\u0438 \u0442\u0435\u0441\u0442, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0437\u043d\u0430\u043d\u0438\u044f</p>
          <a href="#tests/${data.level}-test-1" class="btn btn-primary" style="margin-top:.5rem">\u0422\u0435\u0441\u0442 ${data.level}</a>
        </div>`;
    }

    html += `<div style="margin-top:1rem;text-align:right">
      <a href="#tests/${data.level}-test-1" style="font-size:.85rem;color:var(--text-muted)">Тест ${data.level} →</a>
    </div>`;

    const note = this.progress.getLessonNote(lessonId);
    html += `
      <div class="card" style="margin-top:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap">
          <h3 style="margin-bottom:0">Заметки к уроку</h3>
          <button id="lesson-toggle-btn-${lessonId}" class="btn ${completed ? 'btn-secondary' : 'btn-success'}" onclick="App.toggleLessonCompleted('${lessonId}')">
            ${completed ? 'Снять отметку' : '&#10003; Отметить пройденным'}
          </button>
        </div>
        <textarea id="lesson-note" class="exercise-input" rows="3"
          placeholder="Свои заметки, примеры, вопросы..."
          style="margin-top:.75rem;width:100%;resize:vertical">${note}</textarea>
        <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:.5rem">
          <button class="btn btn-primary" onclick="App.saveLessonNote('${lessonId}')">Сохранить</button>
        </div>
      </div>
    `;

    html += '<div style="display:flex;justify-content:space-between;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">';
    if (idx > 0) {
      const prev = allLessons[idx - 1];
      html += `<a href="#lessons/${prev.id}" class="btn btn-secondary">← ${prev.level} · Урок ${prev.levelPos}</a>`;
    } else {
      html += '<span></span>';
    }
    if (data.vocabularyFile) {
      html += `<a href="#flashcards/${lessonId}" class="btn btn-primary">Карточки</a>`;
    }
    if (idx < allLessons.length - 1) {
      const next = allLessons[idx + 1];
      html += `<a href="#lessons/${next.id}" class="btn btn-secondary">${next.level} · Урок ${next.levelPos} →</a>`;
    } else {
      html += '<span></span>';
    }
    html += '</div>';

    el.innerHTML = html;
  },

  renderLessonSection(sec) {
    switch (sec.type) {
      case 'vocabulary': return this.renderVocabSection(sec);
      case 'dialogue': return this.renderDialogueSection(sec);
      case 'grammar': return this.renderGrammarSection(sec);
      case 'exercises': return this.renderExercisesSection(sec);
      case 'culture': return this.renderCultureSection(sec);
      case 'text': return this.renderTextSection(sec);
      default: return '';
    }
  },

  renderVocabSection(sec) {
    if (!sec.words || sec.words.length === 0) return '';
    let html = `<h3 style="margin-top:1.5rem">${sec.title}</h3><table><thead><tr><th>Nederlands</th><th>\u0420\u0443\u0441\u0441\u043a\u0438\u0439</th>`;
    const hasPron = sec.words.some(w => w.pronunciation);
    const hasHint = sec.words.some(w => w.hint);
    if (hasPron) html += '<th>\u041f\u0440\u043e\u0438\u0437\u043d\u043e\u0448\u0435\u043d\u0438\u0435</th>';
    if (hasHint) html += '<th></th>';
    html += '</tr></thead><tbody>';
    for (const w of sec.words) {
      html += `<tr><td><strong>${w.nl}</strong></td><td>${w.ru}</td>`;
      if (hasPron) html += `<td style="color:var(--text-muted);font-size:.85rem">${w.pronunciation || ''}</td>`;
      if (hasHint) html += `<td style="color:var(--text-muted);font-size:.85rem">${w.hint || ''}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  },

  renderDialogueSection(sec) {
    if (!sec.lines || sec.lines.length === 0) return '';
    let html = `<h3 style="margin-top:1.5rem">${sec.title}</h3>`;
    html += '<div class="card" style="font-family:var(--mono);font-size:.9rem;line-height:1.8">';
    for (const line of sec.lines) {
      if (line.speaker) {
        html += `<div><strong style="color:var(--accent)">${line.speaker}:</strong> ${line.text}</div>`;
      } else {
        html += `<div style="color:var(--text-muted);font-style:italic">${line.text}</div>`;
      }
    }
    html += '</div>';
    if (sec.translation) {
      let translationHtml = '';
      const tLines = sec.translation.split('\n');
      for (const tl of tLines) {
        const sm = tl.match(/^([A-Z]):\s*(.+)$/);
        if (sm) {
          translationHtml += `<div><strong style="color:var(--text-muted)">${sm[1]}:</strong> ${sm[2]}</div>`;
        } else if (tl.trim()) {
          translationHtml += `<div style="font-style:italic">${tl.trim()}</div>`;
        }
      }
      html += `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:var(--accent);font-size:.85rem">\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u0435\u0440\u0435\u0432\u043e\u0434</summary><div class="card" style="margin-top:.5rem;font-size:.85rem;color:var(--text-muted);line-height:1.8">${translationHtml}</div></details>`;
    }
    return html;
  },

  renderGrammarSection(sec) {
    let html = `<h3 style="margin-top:1.5rem">${sec.title}</h3>`;
    if (sec.content) {
      html += `<div class="grammar-rule">${this.mdToHtml(sec.content)}</div>`;
    }
    if (sec.tables) {
      for (const tbl of sec.tables) {
        html += '<table><thead><tr>';
        for (const h of tbl.headers) html += `<th>${h}</th>`;
        html += '</tr></thead><tbody>';
        for (const row of tbl.rows) {
          html += '<tr>';
          for (const cell of row) html += `<td>${cell}</td>`;
          html += '</tr>';
        }
        html += '</tbody></table>';
      }
    }
    if (sec.examples) {
      for (const ex of sec.examples) {
        html += `<div class="example"><span class="example-nl">${ex.nl}</span><span class="example-ru">${ex.ru}</span></div>`;
      }
    }
    if (sec.codeExamples) {
      for (const code of sec.codeExamples) {
        html += `<div class="card" style="font-family:var(--mono);font-size:.85rem;white-space:pre-line;margin:.5rem 0">${code}</div>`;
      }
    }
    return html;
  },

  renderExercisesSection(sec) {
    let html = `<h3 style="margin-top:1.5rem">${sec.title}</h3>`;
    if (sec.items && sec.items.length > 0) {
      for (const item of sec.items) {
        html += '<div class="exercise-item">';
        html += `<p>${item.question || ''}</p>`;
        if (item.options) {
          for (const opt of item.options) {
            html += `<label style="display:block;padding:.25rem 0;color:var(--text-muted)">\u2022 ${opt}</label>`;
          }
        }
        if (item.answer) {
          html += `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:var(--accent);font-size:.85rem">\u041e\u0442\u0432\u0435\u0442</summary><p style="color:var(--green);margin-top:.25rem">${item.answer}</p></details>`;
        }
        if (item.answers) {
          html += `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:var(--accent);font-size:.85rem">\u041e\u0442\u0432\u0435\u0442\u044b</summary><div style="color:var(--green);margin-top:.25rem">${item.answers.join('<br>')}</div></details>`;
        }
        html += '</div>';
      }
    } else if (sec.content) {
      html += `<div class="card">${this.mdToHtml(sec.content)}</div>`;
    }
    return html;
  },

  renderCultureSection(sec) {
    let html = `<h3 style="margin-top:1.5rem;color:var(--accent)">${sec.title}</h3>`;
    html += `<div class="card">${this.mdToHtml(sec.content || '')}</div>`;
    return html;
  },

  renderTextSection(sec) {
    if (!sec.content || sec.content.length < 20) return '';
    return `<div style="margin-top:1rem">${this.mdToHtml(sec.content)}</div>`;
  },

  mdToHtml(text) {
    if (!text) return '';
    const esc = (s) => this.escapeHtml(s);
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;

    const inlineFormat = (s) => {
      let result = '';
      let rest = s;
      while (rest.length > 0) {
        const codeMatch = rest.match(/^`([^`]+)`/);
        if (codeMatch) { result += `<code>${esc(codeMatch[1])}</code>`; rest = rest.slice(codeMatch[0].length); continue; }
        const boldMatch = rest.match(/^\*\*(.+?)\*\*/);
        if (boldMatch) { result += `<strong>${inlineFormat(boldMatch[1])}</strong>`; rest = rest.slice(boldMatch[0].length); continue; }
        const italMatch = rest.match(/^\*(.+?)\*/);
        if (italMatch) { result += `<em>${inlineFormat(italMatch[1])}</em>`; rest = rest.slice(italMatch[0].length); continue; }
        const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const url = linkMatch[2];
          const safe = /^(https?:|#|\/|mailto:)/.test(url) ? url : '#';
          const isExternal = /^https?:/i.test(safe);
          const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
          const extCls = isExternal ? ' class="link-external"' : '';
          const extTitle = isExternal ? ' title="Открывается в новой вкладке"' : '';
          result += `<a href="${esc(safe)}"${extCls}${attrs}${extTitle}>${inlineFormat(linkMatch[1])}</a>`;
          rest = rest.slice(linkMatch[0].length); continue;
        }
        result += esc(rest[0]);
        rest = rest.slice(1);
      }
      return result;
    };

    const parseTable = () => {
      if (i >= lines.length) return false;
      const header = lines[i];
      const separator = lines[i + 1] || '';
      if (!/\|/.test(header) || !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(separator)) return false;
      const splitRow = (row) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const headers = splitRow(header);
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push('<table><thead><tr>' + headers.map((h) => `<th>${inlineFormat(h)}</th>`).join('') + '</tr></thead><tbody>');
      for (const row of rows) {
        out.push('<tr>' + row.map((c) => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table>');
      return true;
    };

    const CALLOUT_META = {
      tip:     { cls: 'callout-tip',     icon: 'i', defaultTitle: 'Совет' },
      info:    { cls: 'callout-tip',     icon: 'i', defaultTitle: 'Полезно знать' },
      warn:    { cls: 'callout-warn',    icon: '!', defaultTitle: 'Важно' },
      warning: { cls: 'callout-warn',    icon: '!', defaultTitle: 'Важно' },
      example: { cls: 'callout-example', icon: 'E', defaultTitle: 'Пример из жизни' },
      fact:    { cls: 'callout-fact',    icon: '?', defaultTitle: 'Факт' },
      success: { cls: 'callout-success', icon: '+', defaultTitle: 'Итог' }
    };

    const parseDirective = () => {
      if (i >= lines.length) return false;
      const openMatch = lines[i].match(/^:::\s*([a-z]+)\s*(.*)$/i);
      if (!openMatch) return false;
      const type = openMatch[1].toLowerCase();
      const title = (openMatch[2] || '').trim();
      let j = i + 1;
      const body = [];
      while (j < lines.length && !/^:::\s*$/.test(lines[j])) {
        body.push(lines[j]);
        j++;
      }
      if (j >= lines.length) return false;
      i = j + 1;

      if (type === 'phrase' || type === 'phrases') {
        const rows = body
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => l.split('|').map((c) => c.trim()));
        out.push('<div class="phrase-box">');
        if (title) out.push(`<div class="phrase-box__title">${inlineFormat(title)}</div>`);
        out.push('<div class="phrase-box__list">');
        for (const r of rows) {
          const nl = r[0] || '';
          const ru = r[1] || '';
          const note = r[2] || '';
          out.push(
            '<div class="phrase-row">' +
              `<span class="phrase-row__nl">${inlineFormat(nl)}</span>` +
              `<span class="phrase-row__ru">${inlineFormat(ru)}</span>` +
              (note ? `<span class="phrase-row__note">${inlineFormat(note)}</span>` : '') +
            '</div>'
          );
        }
        out.push('</div></div>');
        return true;
      }

      if (type === 'stats') {
        const items = body
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => l.split('|').map((c) => c.trim()));
        out.push('<div class="stats-row">');
        for (const it of items) {
          const num = it[0] || '';
          const label = it[1] || '';
          const sub = it[2] || '';
          out.push(
            '<div class="stat-card">' +
              `<div class="stat-card__num">${inlineFormat(num)}</div>` +
              `<div class="stat-card__label">${inlineFormat(label)}</div>` +
              (sub ? `<div class="stat-card__sub">${inlineFormat(sub)}</div>` : '') +
            '</div>'
          );
        }
        out.push('</div>');
        return true;
      }

      if (type === 'steps') {
        const items = body
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((l) => l.split('|').map((c) => c.trim()));
        out.push('<ol class="step-list">');
        for (const it of items) {
          const head = it[0] || '';
          const desc = it[1] || '';
          out.push(
            '<li class="step-item">' +
              `<div class="step-item__title">${inlineFormat(head)}</div>` +
              (desc ? `<div class="step-item__desc">${inlineFormat(desc)}</div>` : '') +
            '</li>'
          );
        }
        out.push('</ol>');
        return true;
      }

      if (type === 'dialogue' || type === 'dialog') {
        out.push('<div class="dialogue">');
        if (title) out.push(`<div class="dialogue__title">${inlineFormat(title)}</div>`);
        for (const raw of body) {
          const line = raw.trim();
          if (!line) continue;
          const m = line.match(/^([^:]{1,24}):\s*(.*)$/);
          if (m) {
            out.push(
              '<div class="dialogue__line">' +
                `<span class="dialogue__speaker">${inlineFormat(m[1].trim())}</span>` +
                `<span class="dialogue__text">${inlineFormat(m[2])}</span>` +
              '</div>'
            );
          } else {
            out.push(`<div class="dialogue__line"><span class="dialogue__text">${inlineFormat(line)}</span></div>`);
          }
        }
        out.push('</div>');
        return true;
      }

      const meta = CALLOUT_META[type];
      if (meta) {
        const effectiveTitle = title || meta.defaultTitle;
        const inner = this.mdToHtml(body.join('\n')).replace(/^<div class="md-content">|<\/div>$/g, '');
        out.push(
          `<div class="callout ${meta.cls}">` +
            `<div class="callout__head"><span class="callout__icon">${meta.icon}</span><span class="callout__title">${inlineFormat(effectiveTitle)}</span></div>` +
            `<div class="callout__body">${inner}</div>` +
          '</div>'
        );
        return true;
      }

      out.push(`<div class="callout callout-tip"><div class="callout__body">${inlineFormat(body.join(' '))}</div></div>`);
      return true;
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '') { i++; continue; }

      if (parseDirective()) continue;

      if (parseTable()) continue;

      const h = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (h) {
        const level = h[1].length + 1;
        const tag = `h${Math.min(level, 6)}`;
        out.push(`<${tag}>${inlineFormat(h[2])}</${tag}>`);
        i++;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        const quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
          quote.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        out.push(`<blockquote>${inlineFormat(quote.join(' '))}</blockquote>`);
        continue;
      }

      if (/^[-*+]\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
          i++;
        }
        out.push('<ul>' + items.map((t) => `<li>${inlineFormat(t)}</li>`).join('') + '</ul>');
        continue;
      }

      if (/^\d+[.)]\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
          i++;
        }
        out.push('<ol>' + items.map((t) => `<li>${inlineFormat(t)}</li>`).join('') + '</ol>');
        continue;
      }

      const para = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|>\s?|[-*+]\s|\d+[.)]\s|\|)/.test(lines[i].trim())) {
        para.push(lines[i].trim());
        i++;
      }
      out.push(`<p>${inlineFormat(para.join(' '))}</p>`);
    }

    return `<div class="md-content">${out.join('')}</div>`;
  },

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

  escapeAttr(s) {
    return String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, ' ');
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

  async renderVerbs(el) {
    if (!this._verbsData) {
      this._verbsData = await this.fetchJSON('data/verbs/irregular.json');
    }
    const data = this._verbsData;
    if (!data) {
      el.innerHTML = this.pageHero('Неправильные глаголы', 'Не удалось загрузить данные.', []);
      return;
    }

    el.innerHTML = `
      ${this.pageHero(
        'Неправильные глаголы',
        `${data.verbs.length} глаголов, сгруппированных по паттернам изменения гласной. Фильтруйте, ищите и открывайте группу, чтобы увидеть закономерность.`,
        [
          { text: `${data.groups.length} групп`, muted: true },
          { text: `${data.verbs.length} глаголов`, muted: false },
        ],
      )}
      <div class="card" style="margin-bottom:1.5rem">
        <h3>Как запоминать эффективно</h3>
        <ul style="padding-left:1.25rem;margin-top:.5rem">
          ${data.bestPractices.map((p) => `<li style="margin-bottom:.4rem">${this.escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
        <input type="text" class="search-box" id="verbs-search" placeholder="Поиск по инфинитиву или переводу..." style="flex:1;min-width:220px">
        <select id="verbs-group-filter" class="search-box" style="max-width:260px">
          <option value="all">Все группы</option>
          ${data.groups.map((g) => `<option value="${g.id}">${this.escapeHtml(g.title)}</option>`).join('')}
        </select>
        <select id="verbs-aux-filter" class="search-box" style="max-width:160px">
          <option value="all">hebben / zijn</option>
          <option value="hebben">только hebben</option>
          <option value="zijn">только zijn</option>
          <option value="both">оба</option>
        </select>
      </div>

      <div id="verbs-list"></div>
    `;

    const groupsMap = {};
    for (const g of data.groups) groupsMap[g.id] = g;

    const renderList = () => {
      const q = (document.getElementById('verbs-search').value || '').trim().toLowerCase();
      const groupFilter = document.getElementById('verbs-group-filter').value;
      const auxFilter = document.getElementById('verbs-aux-filter').value;

      const match = (v) => {
        if (groupFilter !== 'all' && v.group !== groupFilter) return false;
        const aux = v.auxiliary || '';
        if (auxFilter === 'hebben' && aux !== 'hebben') return false;
        if (auxFilter === 'zijn' && aux !== 'zijn') return false;
        if (auxFilter === 'both' && !/\//.test(aux)) return false;
        if (q) {
          const hay = `${v.infinitive} ${v.ru} ${v.imperfectSg} ${v.imperfectPl} ${v.pastParticiple}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      };

      const filtered = data.verbs.filter(match);
      const byGroup = {};
      for (const v of filtered) {
        if (!byGroup[v.group]) byGroup[v.group] = [];
        byGroup[v.group].push(v);
      }

      const groupOrder = data.groups.map((g) => g.id).filter((id) => byGroup[id]);
      if (groupOrder.length === 0) {
        document.getElementById('verbs-list').innerHTML = '<p style="color:var(--text-muted)">Ничего не найдено</p>';
        return;
      }

      let html = '';
      for (const gid of groupOrder) {
        const g = groupsMap[gid] || { title: gid, description: '' };
        const verbs = byGroup[gid].sort((a, b) => a.infinitive.localeCompare(b.infinitive));
        html += `
          <section class="verbs-group card">
            <div class="verbs-group__header">
              <h2 class="verbs-group__title">${this.escapeHtml(g.title)}</h2>
              <span class="verbs-group__count">${verbs.length}</span>
            </div>
            ${g.description ? `<p class="verbs-group__desc">${this.escapeHtml(g.description)}</p>` : ''}
            <div class="verbs-table-wrap">
              <table class="verbs-table">
                <thead>
                  <tr>
                    <th>Infinitief</th>
                    <th>Перевод</th>
                    <th>Imperfect ед.</th>
                    <th>Imperfect мн.</th>
                    <th>Voltooid deelwoord</th>
                    <th>Aux</th>
                  </tr>
                </thead>
                <tbody>
                  ${verbs.map((v) => `
                    <tr>
                      <td><strong>${this.escapeHtml(v.infinitive)}</strong></td>
                      <td class="verbs-table__muted">${this.escapeHtml(v.ru || '')}</td>
                      <td>${this.escapeHtml(v.imperfectSg || '')}</td>
                      <td>${this.escapeHtml(v.imperfectPl || '')}</td>
                      <td>${this.escapeHtml(v.pastParticiple || '')}</td>
                      <td class="verbs-table__aux">${this.escapeHtml(v.auxiliary || '')}</td>
                    </tr>
                    ${v.notes ? `<tr class="verbs-table__note-row"><td colspan="6">${this.escapeHtml(v.notes)}</td></tr>` : ''}
                  `).join('')}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }
      document.getElementById('verbs-list').innerHTML = html;
    };

    document.getElementById('verbs-search').addEventListener('input', renderList);
    document.getElementById('verbs-group-filter').addEventListener('change', renderList);
    document.getElementById('verbs-aux-filter').addEventListener('change', renderList);

    renderList();
  },

  estimateReadingMinutes(text) {
    if (!text) return 1;
    const words = String(text).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  },

  async renderCulture(el) {
    if (!this._cultureIndex) {
      this._cultureIndex = await this.fetchJSON('data/culture/index.json');
    }
    const idx = this._cultureIndex;
    if (!idx) {
      el.innerHTML = this.pageHero('Культура', 'Раздел скоро появится.', []);
      return;
    }

    const totalArticles = (idx.categories || []).reduce((acc, c) => acc + (c.articles || []).length, 0);

    let html = `
      <div class="culture-hero">
        <h1>Культура Нидерландов</h1>
        <p class="culture-hero__summary">${this.escapeHtml(idx.description || 'Статьи о культуре, истории и быте.')}</p>
        <div class="culture-hero__meta">
          <span class="culture-pill">${totalArticles} статей</span>
          <span class="culture-pill culture-pill--muted">Уровень A2–B1</span>
          <span class="culture-pill culture-pill--muted">Примеры и диалоги</span>
        </div>
      </div>
    `;

    for (const cat of idx.categories || []) {
      html += `
        <section class="culture-category">
          <div class="culture-category__head">
            <h2>${this.escapeHtml(cat.title)}</h2>
            <span class="culture-category__count">${(cat.articles || []).length} статей</span>
          </div>
      `;
      if (cat.description) {
        html += `<p class="culture-category__desc">${this.escapeHtml(cat.description)}</p>`;
      }
      html += '<div class="card-grid">';
      for (const art of cat.articles || []) {
        html += `
          <a href="#culture/${art.id}" class="culture-card">
            <h3 class="culture-card__title">${this.escapeHtml(art.title)}</h3>
            ${art.summary ? `<p class="culture-card__summary">${this.escapeHtml(art.summary)}</p>` : ''}
          </a>
        `;
      }
      html += '</div></section>';
    }

    el.innerHTML = html;
  },

  async renderCultureArticle(el, articleId) {
    if (!this._cultureIndex) {
      this._cultureIndex = await this.fetchJSON('data/culture/index.json');
    }
    const idx = this._cultureIndex;
    let article = null;
    let catTitle = '';
    let catId = '';
    if (idx) {
      for (const cat of idx.categories || []) {
        const found = (cat.articles || []).find((a) => a.id === articleId);
        if (found) { article = found; catTitle = cat.title; catId = cat.id; break; }
      }
    }
    if (!article) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#culture">Культура</a> / <span>Не найдено</span></div>
        ${this.pageHero('Статья не найдена', 'Проверь ссылку или вернись к списку.', [{ text: articleId, muted: true }])}
        <p style="margin-top:1rem"><a href="#culture" class="btn btn-primary">К разделу</a></p>
      `;
      return;
    }
    const data = await this.fetchJSON(`data/culture/${article.file}`);
    if (!data) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#culture">Культура</a> / <span>${this.escapeHtml(article.title)}</span></div>
        ${this.pageHero('Не удалось загрузить статью', 'Повтори попытку позже.', [])}
        <p style="margin-top:1rem"><a href="#culture" class="btn btn-primary">К разделу</a></p>
      `;
      return;
    }

    const minutes = this.estimateReadingMinutes(data.content || '');
    const summary = data.summary || article.summary || '';

    el.innerHTML = `
      <div class="culture-article">
        <div class="breadcrumb">
          <a href="#culture">Культура</a> / <span>${this.escapeHtml(catTitle)}</span> / <span>${this.escapeHtml(article.title)}</span>
        </div>
        <div class="culture-hero">
          <h1 class="culture-hero__title">${this.escapeHtml(data.title || article.title)}</h1>
          ${summary ? `<p class="culture-hero__summary">${this.escapeHtml(summary)}</p>` : ''}
          <div class="culture-hero__meta">
            <span class="culture-pill">${this.escapeHtml(catTitle)}</span>
            <span class="culture-pill culture-pill--muted">${minutes} мин чтения</span>
          </div>
        </div>
        ${this.mdToHtml(data.content || '')}
      </div>
    `;
  },

  async renderTests(el) {
    const index = await this.fetchJSON('data/tests/index.json');
    if (!index) {
      el.innerHTML = this.pageHero('\u0422\u0435\u0441\u0442\u044b', '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a.', []);
      return;
    }

    const testResults = (this.progress.data.testResults) || {};

    const byLevel = {};
    const levelOrder = [];
    for (const t of index.tests) {
      if (!byLevel[t.level]) { byLevel[t.level] = []; levelOrder.push(t.level); }
      byLevel[t.level].push(t);
    }

    const totalTests = index.tests.length;
    let html = `
      <div class="page-hero">
        <h1>\u0422\u0435\u0441\u0442\u044b</h1>
        <p class="page-hero__summary">\u0423\u0440\u043e\u0432\u043d\u0435\u0432\u044b\u0435 \u0442\u0435\u0441\u0442\u044b \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0437\u043d\u0430\u043d\u0438\u0439. \u041a\u0430\u0436\u0434\u043e\u043c\u0443 \u0443\u0440\u043e\u0432\u043d\u044e \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b 3 \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u0430.</p>
        <div class="page-hero__meta">
          <span class="culture-pill">${totalTests} \u0442\u0435\u0441\u0442\u043e\u0432</span>
          <span class="culture-pill culture-pill--muted">${levelOrder.length} \u0443\u0440\u043e\u0432\u043d\u0435\u0439</span>
        </div>
      </div>`;

    for (const level of levelOrder) {
      const tests = byLevel[level];
      html += `
        <section class="page-section">
          <div class="page-section__head">
            <h2>\u0423\u0440\u043e\u0432\u0435\u043d\u044c <span class="badge badge-${level.toLowerCase()}">${level}</span></h2>
            <span class="page-section__count">${tests.length}</span>
          </div>
          <div class="card-grid">`;
      for (const t of tests) {
        const passPoints = Math.ceil(t.maxPoints * t.passPercent / 100);
        const r = testResults[t.id];
        const variantLabel = t.variant ? `\u0412\u0430\u0440\u0438\u0430\u043d\u0442 ${t.variant}` : t.id;
        const statusHtml = r
          ? `<p style="color:${r.passed ? 'var(--green)' : 'var(--red)'};font-size:.8rem;margin-top:.25rem">${r.passed ? '\u0421\u0434\u0430\u043d\u043e' : '\u041d\u0435 \u0441\u0434\u0430\u043d\u043e'}: ${r.correct}/${r.total} (${r.percent}%)</p>`
          : '';
        html += `
          <a href="#tests/${t.id}" class="card" style="text-decoration:none;color:inherit">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
              <span class="badge badge-${t.level.toLowerCase()}">${t.level}</span>
              <span style="font-size:.75rem;color:var(--text-muted)">${t.minutes} \u043c\u0438\u043d</span>
            </div>
            <h3>${variantLabel}</h3>
            <p style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem">${t.questionCount} \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432 \u2022 ${t.maxPoints} \u0431\u0430\u043b\u043b\u043e\u0432 \u2022 \u043f\u043e\u0440\u043e\u0433 ${passPoints}</p>
            ${statusHtml}
          </a>`;
      }
      html += '</div></section>';
    }
    el.innerHTML = html;
  },

  async renderTest(el, testId) {
    const data = await this.fetchJSON(`data/tests/${testId}.json`);
    if (!data) {
      el.innerHTML = `
        <div class="breadcrumb"><a href="#tests">\u0422\u0435\u0441\u0442\u044b</a> / <span>\u041e\u0448\u0438\u0431\u043a\u0430</span></div>
        ${this.pageHero('\u0422\u0435\u0441\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d', '\u041f\u0440\u043e\u0432\u0435\u0440\u044c \u0441\u0441\u044b\u043b\u043a\u0443 \u0438\u043b\u0438 \u0432\u044b\u0431\u0435\u0440\u0438 \u0442\u0435\u0441\u0442 \u0438\u0437 \u0441\u043f\u0438\u0441\u043a\u0430.', [{ text: testId, muted: true }])}
        <p style="margin-top:1rem"><a href="#tests" class="btn btn-primary">\u041a \u0442\u0435\u0441\u0442\u0430\u043c</a></p>
      `;
      return;
    }

    const passPoints = Math.ceil(data.maxPoints * data.passPercent / 100);

    const variantLabel = data.variant ? `\u0412\u0430\u0440\u0438\u0430\u043d\u0442 ${data.variant}` : '';
    const titleLabel = variantLabel ? `\u0422\u0435\u0441\u0442 ${data.level} \u2014 ${variantLabel}` : `\u0422\u0435\u0441\u0442 ${data.level}`;

    let html = `
      <div class="breadcrumb">
        <a href="#tests">\u0422\u0435\u0441\u0442\u044b</a> / <span>${this.escapeHtml(titleLabel)}</span>
      </div>
      <div class="page-hero page-hero--slim">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-${data.level.toLowerCase()}">${this.escapeHtml(data.level)}</span>
        </div>
        <h1 class="culture-hero__title">${this.escapeHtml(titleLabel)}</h1>
        <p class="page-hero__summary">${data.minutes} \u043c\u0438\u043d \u2022 ${data.maxPoints} \u0431\u0430\u043b\u043b\u043e\u0432 \u2022 \u043f\u043e\u0440\u043e\u0433 ${passPoints} (${data.passPercent}%)</p>
      </div>
    `;

    for (const sec of data.sections) {
      html += `<h2 style="margin-top:2rem">${sec.title}</h2>`;
      if (sec.points) {
        html += `<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1rem">\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c: ${sec.points} \u0431\u0430\u043b\u043b\u043e\u0432</p>`;
      }

      if (sec.questions && sec.questions.length > 0) {
        for (const q of sec.questions) {
          if (q.context) {
            html += `<blockquote class="test-context">${q.context.replace(/\n/g, '<br>')}</blockquote>`;
          }
          html += `<div class="exercise-item test-question" data-correct="${q.correctLetter || ''}" data-num="${q.num}">`;
          html += `<p class="test-question-text"><span class="test-question-num">${q.num}.</span> ${q.text}</p>`;
          if (q.options && q.options.length > 0) {
            html += '<div class="test-options">';
            for (const opt of q.options) {
              html += `
                <label class="test-option">
                  <input type="radio" name="q${q.num}" value="${opt.letter}">
                  <span class="test-option-letter">${opt.letter}</span>
                  <span class="test-option-text">${opt.text}</span>
                </label>`;
            }
            html += '</div>';
          }
          if (q.explanation) {
            html += `<div class="test-explanation">${q.explanation}</div>`;
          }
          html += '</div>';
        }
      }

      if (sec.writingTask) {
        html += `<div class="card" style="margin:1rem 0">`;
        html += `<div style="white-space:pre-line;line-height:1.6">${this.mdToHtml(sec.writingTask.description)}</div>`;
        if (sec.writingTask.criteria && sec.writingTask.criteria.length > 0) {
          html += '<h4 style="margin-top:1rem">\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0438 \u043e\u0446\u0435\u043d\u043a\u0438:</h4><table><thead><tr><th>\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0439</th><th>\u0411\u0430\u043b\u043b\u044b</th></tr></thead><tbody>';
          for (const c of sec.writingTask.criteria) {
            html += `<tr><td>${c.criterion}</td><td>${c.points}</td></tr>`;
          }
          html += '</tbody></table>';
        }
        html += `<textarea class="exercise-input" rows="6" placeholder="\u041d\u0430\u043f\u0438\u0448\u0438 \u0437\u0434\u0435\u0441\u044c..." style="margin-top:1rem;width:100%;resize:vertical"></textarea>`;
        html += '</div>';
      }

      if (sec.speakingTask) {
        html += '<div class="card" style="margin:1rem 0">';
        for (const task of sec.speakingTask) {
          html += `<h4>${task.title}</h4>`;
          if (task.items && task.items.length > 0) {
            html += '<ul style="padding-left:1.25rem;margin:.5rem 0">';
            for (const item of task.items) {
              html += `<li style="margin-bottom:.25rem">${item}</li>`;
            }
            html += '</ul>';
          }
        }
        html += '</div>';
      }
    }

    html += `
      <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)">
        <button class="btn btn-primary" onclick="App.checkTest('${data.id}', '${data.level}', ${data.maxPoints}, ${passPoints})">\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442\u044b</button>
        <div id="test-result" style="margin-top:1rem"></div>
      </div>
    `;

    html += this.buildTestNavigation(data);

    el.innerHTML = html;

    el.querySelectorAll('.test-option').forEach(label => {
      label.addEventListener('click', () => {
        const parent = label.closest('.test-question');
        parent.querySelectorAll('.test-option').forEach(l => l.classList.remove('selected'));
        label.classList.add('selected');
      });
    });
  },

  checkTest(testId, level, maxPoints, passPoints) {
    const questions = document.querySelectorAll('.test-question');
    let correct = 0;
    let total = 0;

    questions.forEach(q => {
      const correctLetter = q.dataset.correct;
      if (!correctLetter) return;
      total++;

      const selected = q.querySelector('input[type="radio"]:checked');
      const options = q.querySelectorAll('.test-option');
      const explanation = q.querySelector('.test-explanation');

      if (selected && selected.value === correctLetter) {
        correct++;
        options.forEach(l => {
          if (l.querySelector('input').value === correctLetter) {
            l.classList.add('is-correct');
          }
        });
      } else {
        options.forEach(l => {
          const inp = l.querySelector('input');
          if (inp.value === correctLetter) {
            l.classList.add('is-correct');
          } else if (inp.checked) {
            l.classList.add('is-incorrect');
          }
        });
      }

      if (explanation) explanation.classList.add('is-visible');
    });

    const percent = total > 0 ? Math.round(correct / total * 100) : 0;
    const pointsEarned = Math.round(correct / total * maxPoints);
    const passed = pointsEarned >= passPoints;

    const resultEl = document.getElementById('test-result');
    resultEl.innerHTML = `
      <div class="card" style="border-color:${passed ? 'var(--green)' : 'var(--red)'}">
        <h3 style="color:${passed ? 'var(--green)' : 'var(--red)'}">${passed ? '\u0422\u0435\u0441\u0442 \u043f\u0440\u043e\u0439\u0434\u0435\u043d!' : '\u0422\u0435\u0441\u0442 \u043d\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d'}</h3>
        <p style="margin-top:.5rem">\u041f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e: ${correct} \u0438\u0437 ${total} (${percent}%)</p>
        <p>\u0411\u0430\u043b\u043b\u044b: ~${pointsEarned} \u0438\u0437 ${maxPoints} (\u043f\u043e\u0440\u043e\u0433: ${passPoints})</p>
      </div>
    `;

    this.progress.data.testResults = this.progress.data.testResults || {};
    this.progress.data.testResults[testId] = {
      testId, level, correct, total, percent, pointsEarned, maxPoints, passed,
      date: new Date().toISOString()
    };
    this.progress.save();
  },

  buildTestNavigation(data) {
    const levels = this.lessonsIndex ? this.lessonsIndex.levels.map((l) => l.id) : ['A1', 'A2', 'B1', 'B2'];
    const getFirst = (levelId) => {
      if (!this.lessonsIndex) return null;
      const lv = this.lessonsIndex.levels.find((x) => x.id === levelId);
      return lv && lv.lessons[0] ? lv.lessons[0].id : null;
    };
    const idx = levels.indexOf(data.level);
    const currentFirst = getFirst(data.level);

    let html = '<div style="display:flex;flex-wrap:wrap;gap:.75rem;justify-content:space-between;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border)">';
    if (currentFirst) {
      html += `<a href="#lessons/${currentFirst}" class="btn btn-secondary">Уроки ${data.level}</a>`;
    }
    if (idx < levels.length - 1) {
      const nextLevel = levels[idx + 1];
      const nextFirst = getFirst(nextLevel);
      if (nextFirst) {
        html += `<a href="#lessons/${nextFirst}" class="btn btn-primary">Начать ${nextLevel} →</a>`;
      }
    }
    html += '</div>';
    return html;
  },

  HEATMAP_WEEKS: 52,

  buildHeatmap(history) {
    const weeks = this.HEATMAP_WEEKS;
    const days = weeks * 7;
    const now = new Date();
    const byDay = {};
    for (const h of history) {
      const d = (h.date || '').slice(0, 10);
      if (!d) continue;
      byDay[d] = (byDay[d] || 0) + (h.total || 0);
    }
    const todayDow = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - (weeks - 1) * 7 - todayDow);

    const cells = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > now) {
        cells.push('<div class="heatmap-cell future" aria-hidden="true"></div>');
        continue;
      }
      const key = d.toISOString().slice(0, 10);
      const count = byDay[key] || 0;
      let lvl = 0;
      if (count >= 20) lvl = 4;
      else if (count >= 10) lvl = 3;
      else if (count >= 5) lvl = 2;
      else if (count >= 1) lvl = 1;
      cells.push(`<div class="heatmap-cell${lvl ? ' l' + lvl : ''}" title="${key}: ${count}"></div>`);
    }
    return `<div class="heatmap">${cells.join('')}</div>`;
  },

  renderProgress(el) {
    const stats = this.progress.getStats();
    const history = this.progress.data.exerciseHistory || [];
    const recentHistory = history.slice(-15).reverse();
    const totalGrammar = this.grammarIndex ? Object.keys(this.grammarIndex.topics).length : 0;
    const totalLessons = this.allLessonsFlat().length;
    const totalWords = this.vocabIndex ? this.vocabIndex.totalWords : 0;
    const levels = this.levelProgressData();
    const srsCount = Object.keys(this.progress.data.srs || {}).length;
    const dueCount = SRS.getDueCount(this.progress.data);
    const testResults = this.progress.data.testResults || {};
    const notes = this.progress.data.lessonNotes || {};
    const notesEntries = Object.entries(notes);

    el.innerHTML = `
      ${this.pageHero(
        'Прогресс',
        'Статистика уроков, грамматики, карточек и тестов. Экспорт и импорт.',
        [
          { text: `${stats.streak} дн. подряд`, muted: true },
          { text: `${stats.correctRate}% точность`, muted: true },
        ],
      )}

      <div class="card" style="margin-bottom:1.5rem">
        <h3 style="margin-bottom:.5rem">Хранилище прогресса</h3>
        <p style="color:var(--text-muted);font-size:.9rem">Прогресс синхронизируется с Firestore: автоматически сохраняется и подтягивается на любом устройстве, где вы войдёте с тем же Google-аккаунтом.</p>
        <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="App.exportProgress()">Экспорт JSON</button>
          <label class="btn btn-secondary" style="cursor:pointer">
            Импорт JSON
            <input type="file" accept="application/json" onchange="App.importProgressFromInput(event)" style="display:none">
          </label>
          <button class="btn btn-danger" onclick="App.resetProgress()">Сбросить</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.lessonsCompleted}<span style="font-size:1rem;color:var(--text-muted)">/${totalLessons}</span></div>
          <div class="stat-label">Уроков пройдено</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.grammarViewed}<span style="font-size:1rem;color:var(--text-muted)">/${totalGrammar}</span></div>
          <div class="stat-label">Грамматика</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.correctRate}%</div>
          <div class="stat-label">Правильных ответов</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">Дней подряд</div>
        </div>
        <a class="stat-card stat-card--link" href="#flashcards/learning">
          <div class="stat-value">${srsCount}<span style="font-size:1rem;color:var(--text-muted)">/${totalWords}</span></div>
          <div class="stat-label">В изучении (SRS)</div>
        </a>
        <a class="stat-card stat-card--link" href="${dueCount > 0 ? '#flashcards/review' : '#flashcards/learning'}">
          <div class="stat-value" style="color:${dueCount > 0 ? 'var(--accent)' : 'var(--text-muted)'}">${dueCount}</div>
          <div class="stat-label">К повтору</div>
        </a>
      </div>

      <section class="page-section" style="margin-top:1.5rem">
        <div class="page-section__head">
          <h2>Прогресс по уровням</h2>
          <span class="page-section__count">${levels.length}</span>
        </div>
        <div class="level-progress">
          ${levels.map((lv) => `
            <div class="level-progress-item">
              <div class="lp-row">
                <span class="lp-title">${lv.title}</span>
                <span><span class="badge badge-${lv.id.toLowerCase()}">${lv.id}</span></span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${lv.percent}%"></div></div>
              <div class="lp-row" style="margin-top:.4rem;margin-bottom:0">
                <span>${lv.done} из ${lv.total} уроков</span>
                <span>${lv.percent}%</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="page-section" style="margin-top:1.5rem">
        <div class="page-section__head">
          <h2>Активность (52 недели)</h2>
        </div>
        ${this.buildHeatmap(history)}
      </section>

      ${Object.keys(testResults).length > 0 ? `
        <section class="page-section" style="margin-top:1.5rem">
          <div class="page-section__head">
            <h2>Результаты тестов</h2>
            <span class="page-section__count">${Object.keys(testResults).length}</span>
          </div>
        <table>
          <thead><tr><th>Тест</th><th>Результат</th><th>Дата</th></tr></thead>
          <tbody>
            ${Object.entries(testResults)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, r]) => {
                const lvl = r.level || key.split('-')[0] || key;
                const m = key.match(/test-(\d+)/);
                const variantLabel = m ? `Вариант ${m[1]}` : key;
                return `
                  <tr>
                    <td>
                      <span class="badge badge-${lvl.toLowerCase()}">${lvl}</span>
                      <a href="#tests/${key}" style="margin-left:.4rem">${variantLabel}</a>
                    </td>
                    <td style="color:${r.passed ? 'var(--green)' : 'var(--red)'}">
                      ${r.correct}/${r.total} (${r.percent}%) ${r.passed ? '✓' : ''}
                    </td>
                    <td style="color:var(--text-muted)">${new Date(r.date).toLocaleDateString('ru-RU')}</td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
        </section>
      ` : ''}

      <section class="page-section" style="margin-top:1.5rem">
        <div class="page-section__head">
          <h2>Последние упражнения</h2>
          <span class="page-section__count">${recentHistory.length}</span>
        </div>
      ${recentHistory.length > 0 ? `
        <table>
          <thead><tr><th>Тема</th><th>Результат</th><th>Дата</th></tr></thead>
          <tbody>
            ${recentHistory.map(h => `
              <tr>
                <td><a href="#grammar/${h.topic}">${h.topic}</a></td>
                <td>${h.correct}/${h.total} (${h.total > 0 ? Math.round(h.correct / h.total * 100) : 0}%)</td>
                <td style="color:var(--text-muted)">${new Date(h.date).toLocaleDateString('ru-RU')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="color:var(--text-muted)">Пока нет истории</p>'}
      </section>

      ${notesEntries.length > 0 ? `
        <section class="page-section" style="margin-top:1.5rem">
          <div class="page-section__head">
            <h2>Заметки к урокам</h2>
            <span class="page-section__count">${notesEntries.length}</span>
          </div>
        <div class="card-grid">
          ${notesEntries.map(([lessonId, note]) => `
            <a href="#lessons/${lessonId}" class="card" style="text-decoration:none;color:inherit">
              <h3 style="font-size:1rem">${lessonId}</h3>
              <p style="color:var(--text-muted);font-size:.85rem;margin-top:.25rem;white-space:pre-wrap">${this.escapeHtml(note)}</p>
            </a>
          `).join('')}
        </div>
        </section>
      ` : ''}
    `;
  },

  escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  importProgressFromInput(event) {
    const file = event.target && event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        const ok = await this.progress.importData(data);
        if (ok) {
          this.showToast('Прогресс импортирован', 'success');
          this.route(location.hash);
        } else {
          this.showToast('Неверный формат файла', 'error');
        }
      } catch {
        this.showToast('Не удалось прочитать файл', 'error');
      }
    };
    reader.readAsText(file);
  },

  exportProgress() {
    const data = JSON.stringify(this.progress.data, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dutch-progress.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u043d', 'success');
  },

  async resetProgress() {
    if (confirm('Точно сбросить весь прогресс?')) {
      await this.progress.reset();
      this.route(location.hash);
      this.showToast('Прогресс сброшен', 'error');
    }
  },

  showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  toggleLessonCompleted(lessonId) {
    const nowCompleted = !this.progress.isLessonCompleted(lessonId);
    if (nowCompleted) {
      this.progress.markLessonCompleted(lessonId);
      this.showToast('Урок отмечен пройденным', 'success');
    } else {
      this.progress.unmarkLessonCompleted(lessonId);
      this.showToast('Отметка снята', 'success');
    }

    const pillHost = document.getElementById(`lesson-status-pill-${lessonId}`);
    if (pillHost) {
      pillHost.innerHTML = nowCompleted ? '<span class="culture-pill">Пройдено</span>' : '';
    }

    const btn = document.getElementById(`lesson-toggle-btn-${lessonId}`);
    if (btn) {
      btn.classList.toggle('btn-success', !nowCompleted);
      btn.classList.toggle('btn-secondary', nowCompleted);
      btn.innerHTML = nowCompleted ? 'Снять отметку' : '&#10003; Отметить пройденным';
    }
  },

  saveLessonNote(lessonId) {
    const ta = document.getElementById('lesson-note');
    if (!ta) return;
    this.progress.setLessonNote(lessonId, ta.value);
    this.showToast('Заметка сохранена', 'success');
  },

};

window.App = App;
