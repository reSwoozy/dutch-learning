import { App } from '../core/app.js';

Object.assign(App, {
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

    html += `
      <div style="margin-top:1.5rem;text-align:center">
        <button id="lesson-toggle-btn-${lessonId}" class="btn ${completed ? 'btn-secondary' : 'btn-success'}" onclick="App.toggleLessonCompleted('${lessonId}')">
          ${completed ? 'Снять отметку' : '&#10003; Отметить пройденным'}
        </button>
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
    let html = `<h3 style="margin-top:1.5rem">${sec.title}</h3><div class="table-scroll"><table><thead><tr><th>Nederlands</th><th>\u0420\u0443\u0441\u0441\u043a\u0438\u0439</th>`;
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
    html += '</tbody></table></div>';
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
        html += '<div class="table-scroll"><table><thead><tr>';
        for (const h of tbl.headers) html += `<th>${h}</th>`;
        html += '</tr></thead><tbody>';
        for (const row of tbl.rows) {
          html += '<tr>';
          for (const cell of row) html += `<td>${cell}</td>`;
          html += '</tr>';
        }
        html += '</tbody></table></div>';
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
      out.push('<div class="table-scroll"><table><thead><tr>' + headers.map((h) => `<th>${inlineFormat(h)}</th>`).join('') + '</tr></thead><tbody>');
      for (const row of rows) {
        out.push('<tr>' + row.map((c) => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
      }
      out.push('</tbody></table></div>');
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
      const paraLines = para
        .map((l) => l.replace(/^-{3,}$/, '').trim())
        .filter((l) => l.length > 0);
      if (paraLines.length > 0) {
        out.push(`<p>${paraLines.map(inlineFormat).join('<br>')}</p>`);
      }
    }

    return `<div class="md-content">${out.join('')}</div>`;
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

});
