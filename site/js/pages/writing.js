import { App } from '../core/app.js';

Object.assign(App, {
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
});
