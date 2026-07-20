import { useMemo, useState } from 'react';

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

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildActiveDays(history) {
  const active = new Set();
  for (const h of history) {
    if (!h?.date) continue;
    const parsed = new Date(h.date);
    if (!Number.isNaN(parsed.getTime())) {
      active.add(toDayKey(parsed));
      continue;
    }
    const raw = String(h.date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) active.add(raw);
  }
  return active;
}

/** Monday-first offset: Sun=0 → 6, Mon=1 → 0, … */
function mondayOffset(date) {
  return (date.getDay() + 6) % 7;
}

function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = mondayOffset(first);
  const cells = [];

  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayCell({ date, active, todayKey, compact = false }) {
  if (!date) {
    return <span className={`activity-cal__day is-empty${compact ? ' is-compact' : ''}`} aria-hidden="true" />;
  }

  const key = toDayKey(date);
  const isActive = active.has(key);
  const isToday = key === todayKey;
  const cls = [
    'activity-cal__day',
    compact ? 'is-compact' : '',
    isActive ? 'is-active' : '',
    isToday ? 'is-today' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} title={key} aria-label={key}>
      {date.getDate()}
    </span>
  );
}

function MonthGrid({ year, month, active, todayKey, compact = false }) {
  const cells = monthCells(year, month);
  return (
    <div className={`activity-cal__grid${compact ? ' is-compact' : ''}`} role="grid">
      {!compact &&
        WEEKDAYS.map((d) => (
          <span key={d} className="activity-cal__weekday" role="columnheader">
            {d}
          </span>
        ))}
      {cells.map((date, i) => (
        <DayCell key={i} date={date} active={active} todayKey={todayKey} compact={compact} />
      ))}
    </div>
  );
}

export default function ActivityCalendar({ history = [] }) {
  const now = new Date();
  const todayKey = toDayKey(now);
  const active = useMemo(() => buildActiveDays(history), [history]);

  const [mode, setMode] = useState('year');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const title = mode === 'month' ? `${MONTHS[month]} ${year}` : String(year);

  const goPrev = () => {
    if (mode === 'year') {
      setYear((y) => y - 1);
      return;
    }
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (mode === 'year') {
      setYear((y) => y + 1);
      return;
    }
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setMode('month');
  };

  const openMonth = (m) => {
    setMonth(m);
    setMode('month');
  };

  return (
    <div className={`activity-cal activity-cal--${mode}`}>
      <div className="activity-cal__toolbar">
        <div className="activity-cal__nav">
          <button type="button" className="activity-cal__nav-btn" onClick={goPrev} aria-label="Назад">
            ‹
          </button>
          <div className="activity-cal__title">{title}</div>
          <button type="button" className="activity-cal__nav-btn" onClick={goNext} aria-label="Вперёд">
            ›
          </button>
        </div>
        <div className="activity-cal__actions">
          <button type="button" className="activity-cal__chip" onClick={goToday}>
            Сегодня
          </button>
          <div className="activity-cal__modes" role="group" aria-label="Режим календаря">
            <button
              type="button"
              className={`activity-cal__mode-btn${mode === 'month' ? ' is-active' : ''}`}
              onClick={() => setMode('month')}
            >
              Месяц
            </button>
            <button
              type="button"
              className={`activity-cal__mode-btn${mode === 'year' ? ' is-active' : ''}`}
              onClick={() => setMode('year')}
            >
              Год
            </button>
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <MonthGrid year={year} month={month} active={active} todayKey={todayKey} />
      ) : (
        <div className="activity-cal__year">
          {MONTHS_SHORT.map((name, m) => (
            <button
              type="button"
              key={name}
              className={`activity-cal__year-month${m === now.getMonth() && year === now.getFullYear() ? ' is-current' : ''}`}
              onClick={() => openMonth(m)}
              aria-label={`${MONTHS[m]} ${year}`}
            >
              <div className="activity-cal__year-month-title">{name}</div>
              <MonthGrid year={year} month={m} active={active} todayKey={todayKey} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
