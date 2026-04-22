import { App } from '../core/app.js';

Object.assign(App, {
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
});
