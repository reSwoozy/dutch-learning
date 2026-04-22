import { App } from '../core/app.js';

Object.assign(App, {
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
        html += `<h3 style="margin-top:1.5rem">${tbl.title}</h3><div class="table-scroll"><table>`;
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
        html += '</tbody></table></div>';
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
});
