import { App } from '../core/app.js';

Object.assign(App, {
  async renderVerbs(el) {
    if (!this._verbsData) {
      this._verbsData = await this.fetchJSON('data/verbs/irregular.json');
    }
    const data = this._verbsData;
    if (!data) {
      el.innerHTML = this.pageHero('Неправильные глаголы', 'Не удалось загрузить данные.', []);
      return;
    }

    el.innerHTML = `
      ${this.pageHero(
        'Неправильные глаголы',
        `${data.verbs.length} глаголов, сгруппированных по паттернам изменения гласной. Фильтруйте, ищите и открывайте группу, чтобы увидеть закономерность.`,
        [
          { text: `${data.groups.length} групп`, muted: true },
          { text: `${data.verbs.length} глаголов`, muted: false },
        ],
      )}
      <div class="card" style="margin-bottom:1.5rem">
        <h3>Как запоминать эффективно</h3>
        <ul style="padding-left:1.25rem;margin-top:.5rem">
          ${data.bestPractices.map((p) => `<li style="margin-bottom:.4rem">${this.escapeHtml(p)}</li>`).join('')}
        </ul>
      </div>

      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">
        <input type="text" class="search-box" id="verbs-search" placeholder="Поиск по инфинитиву или переводу..." style="flex:1;min-width:220px">
        <select id="verbs-group-filter" class="search-box" style="max-width:260px">
          <option value="all">Все группы</option>
          ${data.groups.map((g) => `<option value="${g.id}">${this.escapeHtml(g.title)}</option>`).join('')}
        </select>
        <select id="verbs-aux-filter" class="search-box" style="max-width:160px">
          <option value="all">hebben / zijn</option>
          <option value="hebben">только hebben</option>
          <option value="zijn">только zijn</option>
          <option value="both">оба</option>
        </select>
      </div>

      <div id="verbs-list"></div>
    `;

    const groupsMap = {};
    for (const g of data.groups) groupsMap[g.id] = g;

    const renderList = () => {
      const q = (document.getElementById('verbs-search').value || '').trim().toLowerCase();
      const groupFilter = document.getElementById('verbs-group-filter').value;
      const auxFilter = document.getElementById('verbs-aux-filter').value;

      const match = (v) => {
        if (groupFilter !== 'all' && v.group !== groupFilter) return false;
        const aux = v.auxiliary || '';
        if (auxFilter === 'hebben' && aux !== 'hebben') return false;
        if (auxFilter === 'zijn' && aux !== 'zijn') return false;
        if (auxFilter === 'both' && !/\//.test(aux)) return false;
        if (q) {
          const hay = `${v.infinitive} ${v.ru} ${v.imperfectSg} ${v.imperfectPl} ${v.pastParticiple}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      };

      const filtered = data.verbs.filter(match);
      const byGroup = {};
      for (const v of filtered) {
        if (!byGroup[v.group]) byGroup[v.group] = [];
        byGroup[v.group].push(v);
      }

      const groupOrder = data.groups.map((g) => g.id).filter((id) => byGroup[id]);
      if (groupOrder.length === 0) {
        document.getElementById('verbs-list').innerHTML = '<p style="color:var(--text-muted)">Ничего не найдено</p>';
        return;
      }

      let html = '';
      for (const gid of groupOrder) {
        const g = groupsMap[gid] || { title: gid, description: '' };
        const verbs = byGroup[gid].sort((a, b) => a.infinitive.localeCompare(b.infinitive));
        html += `
          <section class="verbs-group card">
            <div class="verbs-group__header">
              <h2 class="verbs-group__title">${this.escapeHtml(g.title)}</h2>
              <span class="verbs-group__count">${verbs.length}</span>
            </div>
            ${g.description ? `<p class="verbs-group__desc">${this.escapeHtml(g.description)}</p>` : ''}
            <div class="verbs-table-wrap">
              <table class="verbs-table">
                <thead>
                  <tr>
                    <th>Infinitief</th>
                    <th>Перевод</th>
                    <th>Imperfect ед.</th>
                    <th>Imperfect мн.</th>
                    <th>Voltooid deelwoord</th>
                    <th>Aux</th>
                  </tr>
                </thead>
                <tbody>
                  ${verbs.map((v) => `
                    <tr>
                      <td><strong>${this.escapeHtml(v.infinitive)}</strong></td>
                      <td class="verbs-table__muted">${this.escapeHtml(v.ru || '')}</td>
                      <td>${this.escapeHtml(v.imperfectSg || '')}</td>
                      <td>${this.escapeHtml(v.imperfectPl || '')}</td>
                      <td>${this.escapeHtml(v.pastParticiple || '')}</td>
                      <td class="verbs-table__aux">${this.escapeHtml(v.auxiliary || '')}</td>
                    </tr>
                    ${v.notes ? `<tr class="verbs-table__note-row"><td colspan="6">${this.escapeHtml(v.notes)}</td></tr>` : ''}
                  `).join('')}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }
      document.getElementById('verbs-list').innerHTML = html;
    };

    document.getElementById('verbs-search').addEventListener('input', renderList);
    document.getElementById('verbs-group-filter').addEventListener('change', renderList);
    document.getElementById('verbs-aux-filter').addEventListener('change', renderList);

    renderList();
  },
});
