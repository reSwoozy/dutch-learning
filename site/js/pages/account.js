import { App } from '../core/app.js';
import { signOutUser } from '../core/auth.js';

Object.assign(App, {
  renderAccount(el) {
    const user = window.__dutchUser || null;
    const stats = this.progress.getStats();
    const name = (user && (user.displayName || user.email)) || 'Аккаунт';
    const email = (user && user.email) || '';
    const photo = user && user.photoURL;

    el.innerHTML = `
      ${this.pageHero(
        'Аккаунт',
        'Профиль, синхронизация с Firebase и управление прогрессом.',
        [
          { text: `${stats.streak} дн. подряд`, muted: true },
          { text: `${stats.correctRate}% точность`, muted: true },
        ],
      )}

      <div class="account-card">
        <div class="account-card__avatar">
          ${
            photo
              ? `<img src="${photo}" alt="" referrerpolicy="no-referrer">`
              : `<span class="account-card__initials">${this.escapeHtml(
                  name.slice(0, 1).toUpperCase(),
                )}</span>`
          }
        </div>
        <div class="account-card__body">
          <div class="account-card__name">${this.escapeHtml(name)}</div>
          ${
            email && email !== name
              ? `<div class="account-card__email">${this.escapeHtml(email)}</div>`
              : ''
          }
          <div class="account-card__meta">Прогресс хранится в Firestore и подтягивается автоматически на всех устройствах, где вы войдёте с этим же Google-аккаунтом.</div>
        </div>
      </div>

      <section class="page-section" style="margin-top:1.5rem">
        <div class="page-section__head">
          <h2>Сводка</h2>
        </div>
        <div class="stats-grid">
          <a class="stat-card stat-card--link" href="#progress">
            <div class="stat-value">${stats.lessonsCompleted}</div>
            <div class="stat-label">Уроков пройдено</div>
          </a>
          <a class="stat-card stat-card--link" href="#progress">
            <div class="stat-value">${stats.grammarViewed}</div>
            <div class="stat-label">Тем грамматики</div>
          </a>
          <a class="stat-card stat-card--link" href="#progress">
            <div class="stat-value">${stats.streak}</div>
            <div class="stat-label">Дней подряд</div>
          </a>
          <a class="stat-card stat-card--link" href="#progress">
            <div class="stat-value">${stats.correctRate}%</div>
            <div class="stat-label">Правильных ответов</div>
          </a>
        </div>
        <div style="margin-top:.75rem">
          <a class="btn btn-secondary" href="#progress">Открыть полную статистику</a>
        </div>
      </section>

      <section class="page-section" style="margin-top:1.5rem">
        <div class="page-section__head">
          <h2>Управление</h2>
        </div>
        <div class="account-actions">
          <button type="button" class="btn btn-danger" id="account-reset">Сбросить прогресс</button>
          <button type="button" class="btn btn-secondary" id="account-signout">Выйти из аккаунта</button>
        </div>
        <p class="account-actions__note">Сброс очищает ваш документ в Firestore — операция необратима и синхронизируется со всеми устройствами.</p>
      </section>
    `;

    const resetBtn = document.getElementById('account-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!confirm('Сбросить весь прогресс? Отменить действие нельзя.')) return;
        resetBtn.disabled = true;
        try {
          await this.progress.reset();
          this.showToast('Прогресс сброшен', 'error');
          this.route(location.hash);
        } finally {
          resetBtn.disabled = false;
        }
      });
    }

    const signoutBtn = document.getElementById('account-signout');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async () => {
        signoutBtn.disabled = true;
        try {
          await signOutUser();
        } catch (err) {
          console.error('[account] sign-out failed', err);
          this.showToast('Не удалось выйти, попробуйте ещё раз', 'error');
          signoutBtn.disabled = false;
        }
      });
    }
  },
});
