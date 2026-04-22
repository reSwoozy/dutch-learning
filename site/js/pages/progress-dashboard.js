import { App } from '../core/app.js';
import { SRS } from '../core/srs.js';

Object.assign(App, {
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
});
