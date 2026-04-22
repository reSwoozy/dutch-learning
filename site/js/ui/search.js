import { App } from '../core/app.js';

Object.assign(App, {
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
});
