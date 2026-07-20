import { useEffect, useMemo, useRef, useState } from 'react';

function prefersFineHover() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

const MONTHS_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
];

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/** Row labels: GitHub shows Mon / Wed / Fri (Sun-first grid). */
const WEEKDAY_LABELS = ['', 'Пн', '', 'Ср', '', 'Пт', ''];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** e.g. "Май 25" */
function formatDayLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Sunday-first, like GitHub. */
function startOfWeekSunday(date) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function buildActiveDays(history) {
  const active = new Set();
  for (const h of history) {
    if (!h?.date) continue;
    const parsed = new Date(h.date);
    const key = Number.isNaN(parsed.getTime())
      ? String(h.date).slice(0, 10)
      : toDayKey(parsed);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    active.add(key);
  }
  return active;
}

/**
 * Current year is always shown.
 * If there is older activity, include every year from first activity → now.
 */
function yearsFromHistory(active, nowYear) {
  let firstYear = nowYear;
  for (const key of active) {
    const y = Number(key.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    if (y < firstYear) firstYear = y;
  }

  const years = [];
  for (let y = nowYear; y >= firstYear; y--) years.push(y);
  return years;
}

/** Full calendar year Jan 1 … Dec 31, padded to week boundaries. */
function buildYearWeeks(year) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const rangeStart = startOfWeekSunday(yearStart);
  const rangeEnd = addDays(startOfWeekSunday(yearEnd), 6);

  const weeks = [];
  for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addDays(cursor, 7)) {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(addDays(cursor, i));
    weeks.push(days);
  }
  return { weeks, yearStart, yearEnd };
}

function monthLabelsForWeeks(weeks, year) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((days) => {
    const anchor = days.find((d) => d.getFullYear() === year) || days[0];
    const month = anchor.getMonth();
    const inYear = days.some((d) => d.getFullYear() === year);
    if (!inYear) {
      labels.push(null);
      return;
    }
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({ label: MONTHS_SHORT[month] });
    } else {
      labels.push(null);
    }
  });
  return labels;
}

export default function ActivityCalendar({ history = [] }) {
  const now = useMemo(() => new Date(), []);
  const nowYear = now.getFullYear();
  const active = useMemo(() => buildActiveDays(history), [history]);
  const years = useMemo(() => yearsFromHistory(active, nowYear), [active, nowYear]);
  const [year, setYear] = useState(() => years[0] ?? nowYear);
  const [tip, setTip] = useState(null);
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const yearsRef = useRef(null);
  const todayKey = toDayKey(now);

  useEffect(() => {
    if (!years.length) return;
    if (!years.includes(year)) setYear(years[0]);
  }, [years, year]);

  useEffect(() => {
    setTip(null);
  }, [year]);

  useEffect(() => {
    if (!tip) return;
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target) && event.target.closest('.contrib__cell')) {
        return;
      }
      setTip(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [tip]);

  const { weeks, yearStart, yearEnd } = useMemo(() => buildYearWeeks(year), [year]);
  const monthLabels = useMemo(() => monthLabelsForWeeks(weeks, year), [weeks, year]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const frame = requestAnimationFrame(() => {
      if (scroller.scrollWidth <= scroller.clientWidth + 1) {
        scroller.scrollLeft = 0;
        return;
      }

      if (year === nowYear) {
        const todayEl = scroller.querySelector(`[data-day="${todayKey}"]`);
        if (todayEl) {
          const scrollerRect = scroller.getBoundingClientRect();
          const cellRect = todayEl.getBoundingClientRect();
          const target = scroller.scrollLeft + (cellRect.left - scrollerRect.left) - scrollerRect.width * 0.7;
          scroller.scrollLeft = Math.max(0, target);
          return;
        }
      }

      // Past years / fallback: start of the year
      scroller.scrollLeft = 0;
    });

    return () => cancelAnimationFrame(frame);
  }, [year, weeks, todayKey, nowYear]);

  // Years column height = activity panel height; scroll inside years if needed.
  useEffect(() => {
    const panel = panelRef.current;
    const yearsEl = yearsRef.current;
    if (!panel || !yearsEl) return;

    const sync = () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        yearsEl.style.maxHeight = '';
        return;
      }
      yearsEl.style.maxHeight = `${panel.offsetHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(panel);
    window.addEventListener('resize', sync);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [year, weeks]);

  let activeDays = 0;
  for (const key of active) {
    if (key.startsWith(`${year}-`)) activeDays += 1;
  }

  const summary =
    activeDays > 0
      ? `${activeDays} ${activeDays === 1 ? 'день' : activeDays < 5 ? 'дня' : 'дней'} активности в ${year}`
      : `Нет активности в ${year}`;

  const placeTip = (event, date) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const key = toDayKey(date);
    setTip({
      key,
      text: formatDayLabel(date),
      x: rect.left + rect.width / 2,
      y: Math.max(rect.top, 36),
    });
  };

  const onCellEnter = (event, date) => {
    if (!prefersFineHover()) return;
    placeTip(event, date);
  };

  const onCellLeave = () => {
    if (!prefersFineHover()) return;
    setTip(null);
  };

  const onCellClick = (event, date) => {
    // Desktop: hover. Touch: tap to show / tap again to hide.
    if (prefersFineHover()) return;
    const key = toDayKey(date);
    if (tip?.key === key) {
      setTip(null);
      return;
    }
    placeTip(event, date);
  };

  return (
    <div className="contrib" ref={rootRef}>
      <div className="contrib__summary">{summary}</div>

      <div className="contrib__layout">
        <div className="contrib__panel" ref={panelRef}>
          <div className="contrib__scroll" ref={scrollRef}>
            <div className="contrib__chart" style={{ '--weeks': weeks.length }}>
              <div className="contrib__months" aria-hidden="true">
                <span className="contrib__weekday-spacer" />
                {monthLabels.map((item, i) => (
                  <span key={i} className="contrib__month">
                    {item?.label || ''}
                  </span>
                ))}
              </div>

              <div className="contrib__body">
                <div className="contrib__weekdays" aria-hidden="true">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <span key={i} className="contrib__weekday">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="contrib__grid" role="grid" aria-label={`Активность ${year}`}>
                  {weeks.map((days, wi) => (
                    <div key={wi} className="contrib__week" role="row">
                      {days.map((date) => {
                        const key = toDayKey(date);
                        const inYear = date >= yearStart && date <= yearEnd;
                        if (!inYear) {
                          return (
                            <span
                              key={key}
                              className="contrib__cell is-out"
                              role="gridcell"
                              aria-hidden="true"
                            />
                          );
                        }
                        const isActive = active.has(key);
                        const label = formatDayLabel(date);
                        return (
                          <button
                            type="button"
                            key={key}
                            data-day={key}
                            className={`contrib__cell${isActive ? ' is-active' : ''}${tip?.key === key ? ' is-tip' : ''}`}
                            role="gridcell"
                            aria-label={label}
                            onMouseEnter={(e) => onCellEnter(e, date)}
                            onMouseLeave={onCellLeave}
                            onClick={(e) => onCellClick(e, date)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {tip && (
          <div
            className="contrib__tooltip"
            style={{ left: tip.x, top: tip.y }}
            role="tooltip"
          >
            {tip.text}
          </div>
        )}

        <div className="contrib__years" ref={yearsRef} role="tablist" aria-label="Год">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              role="tab"
              aria-selected={y === year}
              className={`contrib__year-btn${y === year ? ' is-active' : ''}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
