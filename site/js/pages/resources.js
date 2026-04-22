import { App } from '../core/app.js';

Object.assign(App, {
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
});
