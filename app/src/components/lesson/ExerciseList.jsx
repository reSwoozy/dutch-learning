import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';
import { showToast } from '@/components/ui/Toast.jsx';

function normalizeAnswer(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function ExerciseItem({ item, checked, onAnswer, index }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');

  const handleInput = (val) => {
    setInput(val);
    onAnswer(val, index);
  };

  const handleSelect = (opt) => {
    setSelected(opt);
    setRevealed(true);
    onAnswer(opt, index);
  };

  const isCorrect = (opt) => {
    if (item.answer) return opt === item.answer;
    if (item.answers) return item.answers.includes(opt);
    return false;
  };

  const showResult = checked || revealed;
  const prompt = item.sentence || item.question || '';
  const isOpen = !item.options && !item.answer && !item.answers && item.sample;

  if (isOpen) {
    return (
      <div className="exercise-item" style={{ marginBottom: '1rem' }}>
        <p>{prompt}</p>
        <textarea
          className="exercise-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Твой ответ на нидерландском..."
          style={{ width: '100%', marginTop: '.5rem', resize: 'vertical' }}
        />
        <details style={{ marginTop: '.5rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '.85rem' }}>
            Образец ответа
          </summary>
          <p style={{ color: 'var(--green)', marginTop: '.25rem' }}>{item.sample}</p>
        </details>
      </div>
    );
  }

  return (
    <div className="exercise-item" data-answer={item.answer || (item.answers && item.answers[0]) || ''} style={{ marginBottom: '1rem' }}>
      <p>{prompt}</p>
      {item.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          {item.options.map((opt, i) => {
            let style = { padding: '.25rem 0', color: 'var(--text-muted)', cursor: 'pointer' };
            if (showResult && selected === opt) {
              style.color = isCorrect(opt) ? 'var(--green)' : 'var(--red)';
              style.fontWeight = 600;
            } else if (showResult && isCorrect(opt)) {
              style.color = 'var(--green)';
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => !checked && handleSelect(opt)}
                style={{ ...style, background: 'none', border: 'none', textAlign: 'left', fontSize: 'inherit' }}
                disabled={showResult}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
      {!item.options && item.answer && (
        <input
          type="text"
          className="exercise-input"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          disabled={checked}
          style={{ width: '100%', marginTop: '.5rem' }}
        />
      )}
      {!item.options && item.answers && (
        <input
          type="text"
          className="exercise-input"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          disabled={checked}
          style={{ width: '100%', marginTop: '.5rem' }}
        />
      )}
      {!item.options && (item.answer || item.answers) && !checked && (
        <details style={{ marginTop: '.5rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '.85rem' }}>
            Ответ
          </summary>
          <p style={{ color: 'var(--green)', marginTop: '.25rem' }}>
            {item.answer || item.answers?.join(', ')}
          </p>
        </details>
      )}
      {showResult && (item.answer || item.answers) && (
        <p style={{ color: 'var(--green)', marginTop: '.25rem', fontSize: '.9rem' }}>
          Ответ: {item.answer || item.answers?.join(', ')}
        </p>
      )}
      {showResult && item.explanation && (
        <p style={{ color: 'var(--text-muted)', marginTop: '.25rem', fontSize: '.85rem' }}>
          {item.explanation}
        </p>
      )}
    </div>
  );
}

function resolveTopicId(propId) {
  if (propId) return propId;
  if (typeof window === 'undefined') return null;
  const grammar = window.location.pathname.match(/\/grammar\/([^/]+)/);
  if (grammar) return grammar[1];
  const lesson = window.location.pathname.match(/\/lessons\/([^/]+)\/([^/]+)/);
  if (lesson) return `${lesson[1]}/${lesson[2]}`;
  return null;
}

function hasCheckableItems(items) {
  return items.some((it) => it.options || it.answer || it.answers);
}

export default function ExerciseList({ title, items = [], topicId: topicIdProp }) {
  const user = useAuthStore((s) => s.user);
  const recordExercise = useProgressStore((s) => s.recordExercise);
  const topicId = resolveTopicId(topicIdProp);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState({});
  const [summary, setSummary] = useState(null);

  if (items.length === 0) return null;

  const canCheck = hasCheckableItems(items);

  const checkAll = () => {
    let correct = 0;
    let total = 0;
    let unanswered = 0;

    items.forEach((item, i) => {
      const expected = item.answer || (item.answers && item.answers[0]);
      if (!expected && !item.options) return;

      if (item.options) {
        total++;
        const sel = answers[i];
        if (!sel) {
          unanswered++;
        } else if (item.answer && sel === item.answer) {
          correct++;
        } else if (item.answers && item.answers.includes(sel)) {
          correct++;
        }
        return;
      }

      total++;
      const userAns = answers[i] || '';
      if (!userAns.trim()) {
        unanswered++;
      } else {
        const ok =
          item.answers?.some((a) => normalizeAnswer(a) === normalizeAnswer(userAns)) ||
          normalizeAnswer(userAns) === normalizeAnswer(expected);
        if (ok) correct++;
      }
    });

    setChecked(true);

    if (total > 0) {
      const suffix = unanswered > 0 ? ` (без ответа: ${unanswered})` : '';
      setSummary(`${correct} из ${total} правильно${suffix}`);
      if (topicId) {
        recordExercise(topicId, correct, total, user);
      }
      const type = correct === total ? 'success' : 'error';
      showToast(`${correct} из ${total} правильно${suffix}`, type);
    }
  };

  return (
    <div>
      {title && <h3 style={{ marginTop: '1.5rem' }}>{title}</h3>}
      {items.map((item, i) => (
        <ExerciseItem
          key={i}
          item={item}
          checked={checked}
          index={i}
          onAnswer={(val) => setAnswers((prev) => ({ ...prev, [i]: val }))}
        />
      ))}
      {canCheck && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={checkAll}
          disabled={checked}
          style={{ marginTop: '1rem' }}
        >
          {checked ? 'Проверено' : 'Проверить ответы'}
        </button>
      )}
      <p aria-live="polite" role="status" style={{ marginTop: '.5rem', minHeight: '1.2rem', color: 'var(--text-muted)' }}>
        {summary || ''}
      </p>
    </div>
  );
}
