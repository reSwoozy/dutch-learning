import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.js';
import { useProgressStore } from '@/stores/progress.js';

function TestQuestion({ q, result, onSelect, selected }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {q.context && (
        <blockquote className="test-context" style={{ whiteSpace: 'pre-line', marginBottom: '.5rem' }}>
          {q.context}
        </blockquote>
      )}
      <p style={{ marginBottom: '.5rem' }}>
        <strong>{q.num}.</strong> {q.text}
      </p>
      {q.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          {q.options.map((opt) => {
            let cls = 'test-option';
            if (result) {
              if (opt.letter === q.correctLetter) cls += ' is-correct';
              else if (opt.letter === selected && opt.letter !== q.correctLetter) cls += ' is-incorrect';
            } else if (opt.letter === selected) {
              cls += ' selected';
            }
            return (
              <label key={opt.letter} className={cls} style={{ display: 'flex', gap: '.5rem', padding: '.375rem 0', cursor: result ? 'default' : 'pointer' }}>
                <input
                  type="radio"
                  name={`q${q.num}`}
                  value={opt.letter}
                  checked={selected === opt.letter}
                  onChange={() => !result && onSelect(q.num, opt.letter)}
                  disabled={!!result}
                  style={{ marginTop: '.3rem' }}
                />
                <span className="test-option-letter" style={{ fontWeight: 600, minWidth: '1.2rem' }}>{opt.letter}</span>
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      )}
      {result && q.explanation && (
        <div className="test-explanation is-visible" style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>
          {q.explanation}
        </div>
      )}
    </div>
  );
}

export default function TestRunner({ testData, testMeta, lang = 'ru' }) {
  const user = useAuthStore((s) => s.user);
  const saveTestResult = useProgressStore((s) => s.saveTestResult);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [warn, setWarn] = useState(null);

  const handleSelect = useCallback((num, letter) => {
    setAnswers((prev) => ({ ...prev, [num]: letter }));
  }, []);

  const gradableQuestions = () => {
    const qs = [];
    for (const sec of testData.sections) {
      if (!sec.questions) continue;
      for (const q of sec.questions) {
        if (q.correctLetter) qs.push(q);
      }
    }
    return qs;
  };

  const retake = () => {
    setAnswers({});
    setResult(null);
    setWarn(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkTest = ({ force = false } = {}) => {
    const gradable = gradableQuestions();
    const unanswered = gradable.filter((q) => !answers[q.num]).length;
    if (unanswered > 0 && !force) {
      setWarn(`Без ответа: ${unanswered}. Нажми «Проверить» ещё раз, чтобы завершить.`);
      return;
    }
    setWarn(null);

    let correct = 0;
    let total = 0;

    for (const sec of testData.sections) {
      if (!sec.questions) continue;
      for (const q of sec.questions) {
        if (!q.correctLetter) continue;
        total++;
        if (answers[q.num] === q.correctLetter) correct++;
      }
    }

    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const maxPoints = testMeta?.maxPoints || testData.maxPoints || total;
    const passPercent = testMeta?.passPercent || testData.passPercent || 70;
    const pointsEarned = total > 0 ? Math.round((correct / total) * maxPoints) : 0;
    const passPoints = Math.ceil(maxPoints * passPercent / 100);
    const passed = pointsEarned >= passPoints;

    const payload = {
      level: testMeta?.level || testData.level,
      correct,
      total,
      percent,
      pointsEarned,
      maxPoints,
      passPoints,
      passed,
    };

    setResult(payload);

    if (testMeta?.id) {
      saveTestResult(testMeta.id, payload, user);
    }
  };

  return (
    <div>
      {testData.sections.map((sec, si) => (
        <div key={si}>
          <h2 style={{ marginTop: '2rem' }}>{sec.title}</h2>
          {sec.points && (
            <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: '1rem' }}>
              Максимум: {sec.points} баллов
            </p>
          )}
          {sec.questions?.map((q) => (
            <TestQuestion
              key={q.num}
              q={q}
              result={result}
              selected={answers[q.num]}
              onSelect={handleSelect}
            />
          ))}
          {sec.writingTask && (
            <div className="card" style={{ margin: '1rem 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: '.5rem' }}>
                Задание для самопроверки — не учитывается в баллах.
              </p>
              <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{sec.writingTask.description}</div>
              <textarea
                className="exercise-input"
                rows={6}
                placeholder="Напиши здесь..."
                style={{ marginTop: '1rem', width: '100%', resize: 'vertical' }}
              />
              {sec.writingTask.sample && (
                <details style={{ marginTop: '.75rem' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--accent)' }}>Образец ответа</summary>
                  <div style={{ whiteSpace: 'pre-line', marginTop: '.5rem', lineHeight: 1.6 }}>
                    {sec.writingTask.sample}
                  </div>
                </details>
              )}
            </div>
          )}
          {sec.speakingTask && (
            <div className="card" style={{ margin: '1rem 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginBottom: '.5rem' }}>
                Устное задание для самопроверки — не учитывается в баллах.
              </p>
              {sec.speakingTask.map((task, ti) => (
                <div key={ti}>
                  <h4>{task.title}</h4>
                  {task.items && (
                    <ul style={{ paddingLeft: '1.25rem', margin: '.5rem 0' }}>
                      {task.items.map((item, ii) => (
                        <li key={ii} style={{ marginBottom: '.25rem' }}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        {!result ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => checkTest()}>
              Проверить ответы
            </button>
            {warn && (
              <p aria-live="polite" role="status" style={{ marginTop: '.5rem', color: 'var(--red)' }}>
                {warn}
              </p>
            )}
          </>
        ) : (
          <div className="card" style={{ borderColor: result.passed ? 'var(--green)' : 'var(--red)' }}>
            <h3 style={{ color: result.passed ? 'var(--green)' : 'var(--red)' }}>
              {result.passed ? 'Тест пройден!' : 'Тест не пройден'}
            </h3>
            <p style={{ marginTop: '.5rem' }}>
              Правильно: {result.correct} из {result.total} ({result.percent}%)
            </p>
            <p>
              Баллы: ~{result.pointsEarned} из {result.maxPoints} (порог: {result.passPoints})
            </p>
            <button type="button" className="btn btn-secondary" onClick={retake} style={{ marginTop: '1rem' }}>
              Пройти заново
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
