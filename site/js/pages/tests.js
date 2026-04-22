import { App } from '../core/app.js';

Object.assign(App, {
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
          html += '<h4 style="margin-top:1rem">\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0438 \u043e\u0446\u0435\u043d\u043a\u0438:</h4><div class="table-scroll"><table><thead><tr><th>\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0439</th><th>\u0411\u0430\u043b\u043b\u044b</th></tr></thead><tbody>';
          for (const c of sec.writingTask.criteria) {
            html += `<tr><td>${c.criterion}</td><td>${c.points}</td></tr>`;
          }
          html += '</tbody></table></div>';
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
});
