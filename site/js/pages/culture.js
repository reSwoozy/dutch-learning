import { App } from '../core/app.js';

Object.assign(App, {
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
});
