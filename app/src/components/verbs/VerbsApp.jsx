import { useMemo, useState } from 'react';

export default function VerbsApp({ groups = [], verbs = [] }) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [auxFilter, setAuxFilter] = useState('all');

  const groupsMap = useMemo(() => {
    const m = {};
    for (const g of groups) m[g.id] = g;
    return m;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verbs.filter((v) => {
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
    });
  }, [verbs, query, groupFilter, auxFilter]);

  const byGroup = useMemo(() => {
    const m = {};
    for (const v of filtered) {
      if (!m[v.group]) m[v.group] = [];
      m[v.group].push(v);
    }
    for (const id of Object.keys(m)) {
      m[id].sort((a, b) => a.infinitive.localeCompare(b.infinitive));
    }
    return m;
  }, [filtered]);

  const groupOrder = groups.map((g) => g.id).filter((id) => byGroup[id]?.length);

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Imperfectum обычных глаголов</h3>
        <p style={{ marginTop: '.5rem' }}>
          Возьмите основу (инфинитив без <strong>-en</strong>) и добавьте окончание:
        </p>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '.5rem' }}>
          <li style={{ marginBottom: '.4rem' }}>
            Если основа оканчивается на глухой согласный из <strong>&apos;t kofschip</strong> (t, k, f, s, ch, p) —
            добавьте <strong>-te</strong> (ед. ч.) / <strong>-ten</strong> (мн. ч.).
          </li>
          <li style={{ marginBottom: '.4rem' }}>
            Во всех остальных случаях — <strong>-de</strong> (ед. ч.) / <strong>-den</strong> (мн. ч.).
          </li>
          <li style={{ marginBottom: '.4rem' }}>
            werken &rarr; ik <strong>werkte</strong>, wij <strong>werkten</strong>; horen &rarr; ik <strong>hoorde</strong>, wij <strong>hoorden</strong>.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Perfectum обычных глаголов</h3>
        <p style={{ marginTop: '.5rem' }}>
          Формула: <strong>hebben / zijn + ge- + основа + t / d</strong>.
        </p>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '.5rem' }}>
          <li style={{ marginBottom: '.4rem' }}>
            Окончание <strong>-t</strong>, если основа на <strong>&apos;t kofschip</strong> (t, k, f, s, ch, p), иначе <strong>-d</strong>.
          </li>
          <li style={{ marginBottom: '.4rem' }}>
            Приставка <strong>ge-</strong> не добавляется к глаголам на be-, ge-, ver-, er-, her-, ont- и к глаголам на <strong>-eren</strong>.
          </li>
          <li style={{ marginBottom: '.4rem' }}>
            werken &rarr; ik heb <strong>gewerkt</strong>; horen &rarr; ik heb <strong>gehoord</strong>; studeren &rarr; ik heb <strong>gestudeerd</strong>.
          </li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="text"
          className="search-box"
          placeholder="Поиск по инфинитиву или переводу..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select
          className="search-box"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          style={{ maxWidth: 260 }}
        >
          <option value="all">Все группы</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
        <select
          className="search-box"
          value={auxFilter}
          onChange={(e) => setAuxFilter(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="all">hebben / zijn</option>
          <option value="hebben">только hebben</option>
          <option value="zijn">только zijn</option>
          <option value="both">оба</option>
        </select>
      </div>

      {groupOrder.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Ничего не найдено</p>
      ) : (
        groupOrder.map((gid) => {
          const g = groupsMap[gid] || { title: gid };
          const list = byGroup[gid];
          return (
            <section key={gid} className="verbs-group card page-section">
              <div className="verbs-group__header">
                <h2 className="verbs-group__title">{g.title}</h2>
                <span className="verbs-group__count">{list.length}</span>
              </div>
              {g.description && <p className="verbs-group__desc">{g.description}</p>}
              <div className="verbs-table-wrap table-scroll">
                <table className="verbs-table">
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
                    {list.flatMap((v) => {
                      const rows = [
                        <tr key={v.infinitive}>
                          <td><strong>{v.infinitive}</strong></td>
                          <td className="verbs-table__muted">{v.ru || ''}</td>
                          <td>{v.imperfectSg || ''}</td>
                          <td>{v.imperfectPl || ''}</td>
                          <td>{v.pastParticiple || ''}</td>
                          <td className="verbs-table__aux">{v.auxiliary || ''}</td>
                        </tr>,
                      ];
                      if (v.notes) {
                        rows.push(
                          <tr key={`${v.infinitive}-note`} className="verbs-table__note-row">
                            <td colSpan={6}>{v.notes}</td>
                          </tr>,
                        );
                      }
                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
