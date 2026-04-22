import { App } from '../core/app.js';
import { SRS } from '../core/srs.js';

Object.assign(App, {
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
        <a href="#account" class="hs-link">Подробная статистика →</a>
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
});
