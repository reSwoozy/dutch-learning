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

function expectedAnswers(item) {
  if (item.answers?.length) return item.answers;
  if (item.answer) return [item.answer];
  return [];
}

function isOptionCorrect(item, opt) {
  return expectedAnswers(item).includes(opt);
}

function isTextCorrect(item, userAns) {
  if (!userAns?.trim()) return false;
  return expectedAnswers(item).some((a) => normalizeAnswer(a) === normalizeAnswer(userAns));
}

function ExerciseItem({ item, checked, onAnswer, index, userAnswer }) {
  const [input, setInput] = useState('');
  const [showSample, setShowSample] = useState(false);

  const prompt = item.sentence || item.question || '';
  const isOpen = !item.options && !item.answer && !item.answers && item.sample;
  const selected = item.options ? userAnswer : null;

  const handleInput = (val) => {
    if (checked) return;
    setInput(val);
    onAnswer(val, index);
  };

  const handleSelect = (opt) => {
    if (checked) return;
    onAnswer(opt, index);
  };

  if (isOpen) {
    return (
      <div className="exercise-item">
        <p>{prompt}</p>
        <textarea
          className="exercise-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Твой ответ на нидерландском..."
          disabled={showSample}
        />
        {!showSample ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            style={{ marginTop: '.5rem' }}
            onClick={() => setShowSample(true)}
          >
            Показать образец
          </button>
        ) : (
          <p className="exercise-feedback show correct" style={{ display: 'block' }}>
            Образец: {item.sample}
          </p>
        )}
      </div>
    );
  }

  const textValue = userAnswer ?? input;
  const textOk = checked && (item.answer || item.answers) && !item.options
    ? isTextCorrect(item, textValue)
    : null;

  return (
    <div className="exercise-item">
      <p>{prompt}</p>

      {item.options && (
        <div className="exercise-options" role="group" aria-label="Варианты ответа">
          {item.options.map((opt, i) => {
            const isSelected = selected === opt;
            const correct = isOptionCorrect(item, opt);
            let cls = 'exercise-option';
            if (checked) {
              if (correct) cls += ' is-correct';
              else if (isSelected) cls += ' is-incorrect';
            } else if (isSelected) {
              cls += ' is-selected';
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                onClick={() => handleSelect(opt)}
                disabled={checked}
                aria-pressed={isSelected}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {!item.options && (item.answer || item.answers) && (
        <input
          type="text"
          className={[
            'exercise-input',
            checked && textOk === true ? 'correct' : '',
            checked && textOk === false ? 'incorrect' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          value={textValue}
          onChange={(e) => handleInput(e.target.value)}
          disabled={checked}
          autoComplete="off"
        />
      )}

      {checked && item.options && (
        <p
          className={`exercise-feedback show ${
            selected && isOptionCorrect(item, selected) ? 'correct' : 'incorrect'
          }`}
        >
          {selected && isOptionCorrect(item, selected)
            ? 'Верно'
            : `Правильный ответ: ${expectedAnswers(item).join(', ')}`}
        </p>
      )}

      {checked && !item.options && (item.answer || item.answers) && (
        <p className={`exercise-feedback show ${textOk ? 'correct' : 'incorrect'}`}>
          {textOk ? 'Верно' : `Правильный ответ: ${expectedAnswers(item).join(', ')}`}
        </p>
      )}

      {checked && item.explanation && (
        <p className="exercise-explanation">{item.explanation}</p>
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
    if (checked) return;

    let correct = 0;
    let total = 0;
    let unanswered = 0;

    items.forEach((item, i) => {
      if (item.options) {
        total++;
        const sel = answers[i];
        if (!sel) unanswered++;
        else if (isOptionCorrect(item, sel)) correct++;
        return;
      }

      if (!item.answer && !item.answers) return;

      total++;
      const userAns = answers[i] || '';
      if (!userAns.trim()) unanswered++;
      else if (isTextCorrect(item, userAns)) correct++;
    });

    setChecked(true);

    if (total > 0) {
      const suffix = unanswered > 0 ? ` (без ответа: ${unanswered})` : '';
      setSummary(`${correct} из ${total} правильно${suffix}`);
      if (topicId) {
        recordExercise(topicId, correct, total, user);
      }
      showToast(`${correct} из ${total} правильно${suffix}`, correct === total ? 'success' : 'error');
    }
  };

  return (
    <div className="exercise-list">
      {title && <h3 className="exercise-list__title">{title}</h3>}
      {items.map((item, i) => (
        <ExerciseItem
          key={i}
          item={item}
          checked={checked}
          index={i}
          userAnswer={answers[i]}
          onAnswer={(val) => setAnswers((prev) => ({ ...prev, [i]: val }))}
        />
      ))}
      {canCheck && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={checkAll}
          disabled={checked}
        >
          {checked ? 'Проверено' : 'Проверить ответы'}
        </button>
      )}
      <p className="exercise-list__summary" aria-live="polite" role="status">
        {summary || ''}
      </p>
    </div>
  );
}
