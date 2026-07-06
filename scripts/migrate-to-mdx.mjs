#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const SITE_DATA = path.resolve('site/data');
const APP_CONTENT = path.resolve('app/src/content');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function escapeJsString(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

function escapeForMdx(s) {
  return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
}

function sectionToMdx(sec) {
  const lines = [];

  switch (sec.type) {
    case 'vocabulary':
      lines.push(`<Vocabulary words={vocab${sec._vocabKey ? `.${sec._vocabKey}` : ''}} locale="ru" />`);
      break;

    case 'dialogue': {
      const linesJson = JSON.stringify(sec.lines, null, 2);
      lines.push(`<Dialogue`);
      lines.push(`  title="${escapeJsString(sec.title || '')}"`);
      lines.push(`  lines={${linesJson}}`);
      if (sec.translation) {
        if (typeof sec.translation === 'string') {
          const tLines = sec.translation.split('\n').filter(l => l.trim());
          const translationArr = tLines.map(l => {
            const m = l.match(/^([A-Z]):\s*(.+)$/);
            return m ? { speaker: m[1], text: m[2] } : { text: l.trim() };
          });
          lines.push(`  translation={${JSON.stringify(translationArr, null, 2)}}`);
        }
      }
      lines.push(`/>`);
      break;
    }

    case 'grammar': {
      if (sec.title) lines.push(`## ${sec.title}`);
      if (sec.content) {
        lines.push('');
        lines.push(convertMarkdownDirectives(sec.content));
      }
      if (sec.tables) {
        for (const tbl of sec.tables) {
          lines.push('');
          lines.push(`<GrammarTable`);
          lines.push(`  headers={${JSON.stringify(tbl.headers)}}`);
          lines.push(`  rows={${JSON.stringify(tbl.rows)}}`);
          lines.push(`/>`);
        }
      }
      if (sec.examples) {
        lines.push('');
        for (const ex of sec.examples) {
          lines.push(`<Example nl="${escapeJsString(ex.nl)}" ru="${escapeJsString(ex.ru)}" />`);
        }
      }
      if (sec.codeExamples) {
        for (const code of sec.codeExamples) {
          lines.push('');
          lines.push('```');
          lines.push(code);
          lines.push('```');
        }
      }
      break;
    }

    case 'exercises': {
      if (sec.title) lines.push(`## ${sec.title}`);
      if (sec.items && sec.items.length > 0) {
        lines.push('');
        lines.push(`<ExerciseList client:load items={${JSON.stringify(sec.items, null, 2)}} />`);
      } else if (sec.content) {
        lines.push('');
        lines.push(convertMarkdownDirectives(sec.content));
      }
      break;
    }

    case 'culture': {
      if (sec.title) lines.push(`## ${sec.title}`);
      if (sec.content) {
        lines.push('');
        lines.push(convertMarkdownDirectives(sec.content));
      }
      break;
    }

    case 'text': {
      if (sec.title) lines.push(`## ${sec.title}`);
      if (sec.content) {
        lines.push('');
        lines.push(convertMarkdownDirectives(sec.content));
      }
      break;
    }

    default:
      if (sec.title) lines.push(`## ${sec.title}`);
      if (sec.content) lines.push(convertMarkdownDirectives(sec.content));
  }

  return lines.join('\n');
}

function convertMarkdownDirectives(text) {
  if (!text) return '';
  let result = text;

  result = result.replace(/:::\s*tip\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Tip${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Tip>`;
  });
  result = result.replace(/:::\s*warn(?:ing)?\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Warn${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Warn>`;
  });
  result = result.replace(/:::\s*example\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Callout variant="example"${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Callout>`;
  });
  result = result.replace(/:::\s*fact\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Fact${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Fact>`;
  });
  result = result.replace(/:::\s*success\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Success${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Success>`;
  });
  result = result.replace(/:::\s*info\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const t = title.trim();
    return `<Tip${t ? ` title="${escapeJsString(t)}"` : ''}>\n${body.trim()}\n</Tip>`;
  });

  result = result.replace(/:::\s*phrase[s]?\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const rows = body.trim().split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
      const parts = l.split('|').map(c => c.trim());
      return `{ nl: '${escapeJsString(parts[0])}', ru: '${escapeJsString(parts[1] || '')}' ${parts[2] ? `, note: '${escapeJsString(parts[2])}'` : ''}}`;
    });
    const t = title.trim();
    return `<Phrases${t ? ` title="${escapeJsString(t)}"` : ''} rows={[\n  ${rows.join(',\n  ')}\n]} />`;
  });

  result = result.replace(/:::\s*stats\s*(.*?)\n([\s\S]*?):::/g, (_, _title, body) => {
    const items = body.trim().split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
      const parts = l.split('|').map(c => c.trim());
      return `{ num: '${escapeJsString(parts[0])}', label: '${escapeJsString(parts[1] || '')}' ${parts[2] ? `, sub: '${escapeJsString(parts[2])}'` : ''}}`;
    });
    return `<Stats items={[\n  ${items.join(',\n  ')}\n]} />`;
  });

  result = result.replace(/:::\s*steps\s*(.*?)\n([\s\S]*?):::/g, (_, _title, body) => {
    const items = body.trim().split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
      const parts = l.split('|').map(c => c.trim());
      return `{ title: '${escapeJsString(parts[0])}' ${parts[1] ? `, desc: '${escapeJsString(parts[1])}'` : ''}}`;
    });
    return `<Steps items={[\n  ${items.join(',\n  ')}\n]} />`;
  });

  result = result.replace(/:::\s*dialog(?:ue)?\s*(.*?)\n([\s\S]*?):::/g, (_, title, body) => {
    const lines = body.trim().split('\n').filter(l => l.trim()).map(l => {
      const m = l.match(/^([^:]{1,24}):\s*(.*)$/);
      return m
        ? `{ speaker: '${escapeJsString(m[1].trim())}', text: '${escapeJsString(m[2])}' }`
        : `{ text: '${escapeJsString(l.trim())}' }`;
    });
    const t = title.trim();
    return `<Dialogue${t ? ` title="${escapeJsString(t)}"` : ''} lines={[\n  ${lines.join(',\n  ')}\n]} />`;
  });

  return result;
}


// ---- LESSONS ----

function migrateLessons() {
  const indexPath = path.join(SITE_DATA, 'lessons/index.json');
  if (!fs.existsSync(indexPath)) return;
  const index = readJSON(indexPath);

  const legacyMap = {};
  const allLessons = [];
  let counter = {};

  for (const level of index.levels) {
    const lvl = level.id.toLowerCase();
    counter[lvl] = 0;

    for (const lesson of level.lessons) {
      counter[lvl]++;
      const num = pad(counter[lvl]);
      const newId = `${lvl}/${num}`;
      legacyMap[lesson.id] = newId;

      const lessonDir = path.join(APP_CONTENT, 'lessons', lvl, num);
      ensureDir(lessonDir);

      const lessonFile = path.join(SITE_DATA, `lessons/${lesson.id}.json`);
      if (!fs.existsSync(lessonFile)) {
        console.warn(`  SKIP: ${lessonFile} not found`);
        continue;
      }

      const data = readJSON(lessonFile);

      const meta = {
        id: newId,
        legacyId: lesson.id,
        num: counter[lvl],
        level: lvl,
        title: data.title || lesson.title,
        minutes: data.minutes || 15,
      };

      fs.writeFileSync(
        path.join(lessonDir, 'meta.js'),
        `export default ${JSON.stringify(meta, null, 2)};\n`,
      );

      const vocabSections = data.sections?.filter(s => s.type === 'vocabulary') || [];
      if (vocabSections.length > 0) {
        const vocabObj = {};
        vocabSections.forEach((vs, idx) => {
          const key = idx === 0 ? 'main' : `section${idx + 1}`;
          vs._vocabKey = key;
          vocabObj[key] = (vs.words || []).map(w => ({
            nl: w.nl,
            ru: w.ru,
            en: '',
            pronunciation: w.pronunciation || '',
            hint: { ru: w.hint || '', en: '' },
          }));
        });
        fs.writeFileSync(
          path.join(lessonDir, 'vocab.js'),
          `export default ${JSON.stringify(vocabObj, null, 2)};\n`,
        );
      }

      const imports = [
        `import { Vocabulary, Dialogue, Tip, Warn, Fact, Success, Callout, Example, Phrases, Stats, Steps, GrammarTable, ExerciseList } from '@/components/lesson';`,
      ];
      if (vocabSections.length > 0) {
        imports.push(`import vocab from './vocab.js';`);
      }

      const mdxParts = [];
      mdxParts.push('---');
      mdxParts.push(`title: "${escapeJsString(data.title || lesson.title)}"`);
      if (data.objectives && data.objectives.length > 0) {
        mdxParts.push('objectives:');
        for (const obj of data.objectives) {
          mdxParts.push(`  - "${escapeJsString(obj)}"`);
        }
      }
      mdxParts.push('---');
      mdxParts.push('');
      mdxParts.push(imports.join('\n'));
      mdxParts.push('');

      for (const sec of data.sections || []) {
        mdxParts.push('');
        if (sec.type !== 'grammar' && sec.type !== 'exercises' && sec.type !== 'culture' && sec.type !== 'text' && sec.title) {
          mdxParts.push(`## ${sec.title}`);
          mdxParts.push('');
        }
        mdxParts.push(sectionToMdx(sec));
      }

      fs.writeFileSync(path.join(lessonDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');

      allLessons.push({ ...meta, sectionCount: data.sections?.length || 0 });
      console.log(`  ${lesson.id} -> ${newId}`);
    }
  }

  fs.writeFileSync(
    path.join(APP_CONTENT, 'lessons/legacy-id-map.js'),
    `export const LEGACY_LESSON_ID_MAP = ${JSON.stringify(legacyMap, null, 2)};\n`,
  );

  const levelsExport = index.levels.map(lv => ({
    id: lv.id.toLowerCase(),
    title: lv.title,
    lessons: lv.lessons.map(l => legacyMap[l.id]),
  }));
  fs.writeFileSync(
    path.join(APP_CONTENT, 'lessons/index.js'),
    `export const levels = ${JSON.stringify(levelsExport, null, 2)};\n\nexport const allLessons = ${JSON.stringify(allLessons, null, 2)};\n`,
  );

  console.log(`Migrated ${Object.keys(legacyMap).length} lessons`);
  return legacyMap;
}


// ---- GRAMMAR ----

function migrateGrammar(lessonMap) {
  const indexPath = path.join(SITE_DATA, 'grammar/index.json');
  if (!fs.existsSync(indexPath)) return;
  const index = readJSON(indexPath);

  const allTopics = [];
  const topicFiles = fs.readdirSync(path.join(SITE_DATA, 'grammar')).filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of topicFiles) {
    const slug = file.replace('.json', '');
    const data = readJSON(path.join(SITE_DATA, `grammar/${file}`));

    const topicDir = path.join(APP_CONTENT, 'grammar', slug);
    ensureDir(topicDir);

    let inLessons = [];
    if (index.topics?.[slug]?.inLessons) {
      inLessons = index.topics[slug].inLessons;
    } else if (data.inLessons) {
      inLessons = data.inLessons;
    }

    const newInLessons = inLessons.map(num => {
      const oldId = Object.keys(lessonMap || {}).find(k => {
        const m = k.match(/lesson-(\d+)$/);
        return m && parseInt(m[1]) === num;
      });
      return oldId ? lessonMap[oldId] : String(num);
    });

    const meta = {
      id: slug,
      title: data.title || slug,
      titleNL: data.titleNL || '',
      level: (data.level || 'A1').toLowerCase(),
      summary: data.summary || '',
      inLessons: newInLessons,
    };

    fs.writeFileSync(path.join(topicDir, 'meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

    const mdxParts = ['---'];
    mdxParts.push(`title: "${escapeJsString(data.title || slug)}"`);
    mdxParts.push(`level: "${(data.level || 'A1').toLowerCase()}"`);
    mdxParts.push('---');
    mdxParts.push('');
    mdxParts.push(`import { GrammarTable, Example, Tip, Warn, Fact, Callout, Phrases, ExerciseList } from '@/components/lesson';`);
    mdxParts.push('');

    if (data.summary) {
      mdxParts.push(data.summary);
      mdxParts.push('');
    }

    if (data.rule) {
      if (data.rule.formula) {
        mdxParts.push(`**${data.rule.formula}**`);
        mdxParts.push('');
      }
      if (data.rule.explanation) {
        mdxParts.push(data.rule.explanation);
        mdxParts.push('');
      }
      if (data.rule.whenToUse) {
        for (const w of data.rule.whenToUse) {
          mdxParts.push(`- ${w}`);
        }
        mdxParts.push('');
      }
    }

    if (data.tables) {
      for (const tbl of data.tables) {
        if (tbl.title) mdxParts.push(`### ${tbl.title}`);
        mdxParts.push('');
        mdxParts.push(`<GrammarTable headers={${JSON.stringify(tbl.headers)}} rows={${JSON.stringify(tbl.rows)}} />`);
        mdxParts.push('');
      }
    }

    if (data.tips) {
      for (const tip of data.tips) {
        mdxParts.push(`<Tip title="${escapeJsString(tip.title)}">`);
        if (tip.items) {
          for (const item of tip.items) {
            mdxParts.push(`- ${item}`);
          }
        }
        if (tip.content) mdxParts.push(tip.content);
        mdxParts.push('</Tip>');
        mdxParts.push('');
      }
    }

    if (data.examples) {
      mdxParts.push('## Примеры');
      mdxParts.push('');
      for (const ex of data.examples) {
        mdxParts.push(`<Example nl="${escapeJsString(ex.nl)}" ru="${escapeJsString(ex.ru)}" />`);
      }
      mdxParts.push('');
    }

    if (data.exercises) {
      mdxParts.push('## Упражнения');
      mdxParts.push('');
      mdxParts.push(`<ExerciseList client:load items={${JSON.stringify(data.exercises, null, 2)}} />`);
      mdxParts.push('');
    }

    if (data.content) {
      mdxParts.push(convertMarkdownDirectives(data.content));
    }

    fs.writeFileSync(path.join(topicDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');

    allTopics.push(meta);
    console.log(`  grammar: ${slug}`);
  }

  const categories = index.categories || [];
  fs.writeFileSync(
    path.join(APP_CONTENT, 'grammar/index.js'),
    `export const categories = ${JSON.stringify(categories, null, 2)};\n\nexport const allTopics = ${JSON.stringify(allTopics, null, 2)};\n`,
  );

  console.log(`Migrated ${allTopics.length} grammar topics`);
}


// ---- TESTS ----

function migrateTests() {
  const indexPath = path.join(SITE_DATA, 'tests/index.json');
  const testFiles = fs.readdirSync(path.join(SITE_DATA, 'tests')).filter(f => f.endsWith('.json') && f !== 'index.json');

  const legacyMap = {};
  const counter = {};

  for (const file of testFiles) {
    const data = readJSON(path.join(SITE_DATA, `tests/${file}`));
    const oldId = file.replace('.json', '');

    let level = 'misc';
    const m = oldId.match(/^([A-Za-z]+\d?)-test-(\d+)$/);
    if (m) {
      level = m[1].toLowerCase();
    } else if (oldId.startsWith('knm')) {
      level = 'knm';
    }

    counter[level] = (counter[level] || 0) + 1;
    const num = pad(counter[level]);
    const newId = `${level}/${num}`;
    legacyMap[oldId] = newId;

    const testDir = path.join(APP_CONTENT, 'tests', level, num);
    ensureDir(testDir);

    const meta = {
      id: newId,
      legacyId: oldId,
      level,
      num: counter[level],
      title: data.title || oldId,
      passingScore: data.passingScore || 70,
    };
    fs.writeFileSync(path.join(testDir, 'meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

    if (data.questions) {
      const questions = data.questions.map(q => ({
        question: { ru: q.question || q.q || '', en: '' },
        options: (q.options || []).map(o => ({ ru: typeof o === 'string' ? o : o.text || '', en: '' })),
        answer: q.answer ?? q.correct ?? 0,
        explanation: { ru: q.explanation || '', en: '' },
      }));
      fs.writeFileSync(path.join(testDir, 'questions.js'), `export default ${JSON.stringify(questions, null, 2)};\n`);
    }

    const mdxParts = ['---'];
    mdxParts.push(`title: "${escapeJsString(data.title || oldId)}"`);
    mdxParts.push('---');
    mdxParts.push('');
    mdxParts.push(`Тест ${level.toUpperCase()} — вариант ${counter[level]}`);

    fs.writeFileSync(path.join(testDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');

    console.log(`  test: ${oldId} -> ${newId}`);
  }

  fs.writeFileSync(
    path.join(APP_CONTENT, 'tests/legacy-id-map.js'),
    `export const LEGACY_TEST_ID_MAP = ${JSON.stringify(legacyMap, null, 2)};\n`,
  );

  console.log(`Migrated ${Object.keys(legacyMap).length} tests`);
  return legacyMap;
}


// ---- READING ----

function migrateReading() {
  const readingDir = path.join(SITE_DATA, 'reading');
  const files = fs.readdirSync(readingDir).filter(f => f.endsWith('.json') && f !== 'index.json');

  const legacyMap = {};
  const counter = {};

  for (const file of files) {
    const data = readJSON(path.join(readingDir, file));
    const oldId = file.replace('.json', '');

    const m = oldId.match(/^([A-Za-z]+\d?)-text-(\d+)$/);
    const level = m ? m[1].toLowerCase() : 'misc';

    counter[level] = (counter[level] || 0) + 1;
    const num = pad(counter[level]);
    const newId = `${level}/${num}`;
    legacyMap[oldId] = newId;

    const targetDir = path.join(APP_CONTENT, 'reading', level, num);
    ensureDir(targetDir);

    const meta = {
      id: newId,
      legacyId: oldId,
      level,
      num: counter[level],
      title: data.title || oldId,
    };
    fs.writeFileSync(path.join(targetDir, 'meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

    if (data.paragraphs || data.text) {
      const paragraphs = data.paragraphs || (data.text ? [{ nl: data.text, translations: { ru: data.translation || '' } }] : []);
      fs.writeFileSync(path.join(targetDir, 'text.js'), `export default ${JSON.stringify({ paragraphs }, null, 2)};\n`);
    }

    if (data.questions) {
      fs.writeFileSync(path.join(targetDir, 'questions.js'), `export default ${JSON.stringify(data.questions, null, 2)};\n`);
    }

    const mdxParts = ['---'];
    mdxParts.push(`title: "${escapeJsString(data.title || oldId)}"`);
    mdxParts.push('---');
    mdxParts.push('');
    if (data.content) {
      mdxParts.push(convertMarkdownDirectives(data.content));
    } else {
      mdxParts.push(`Текст для чтения — ${level.toUpperCase()}`);
    }

    fs.writeFileSync(path.join(targetDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');

    console.log(`  reading: ${oldId} -> ${newId}`);
  }

  fs.writeFileSync(
    path.join(APP_CONTENT, 'reading/legacy-id-map.js'),
    `export const LEGACY_READING_ID_MAP = ${JSON.stringify(legacyMap, null, 2)};\n`,
  );

  console.log(`Migrated ${Object.keys(legacyMap).length} reading texts`);
  return legacyMap;
}


// ---- WRITING ----

function migrateWriting() {
  const writingDir = path.join(SITE_DATA, 'writing');
  const files = fs.readdirSync(writingDir).filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of files) {
    const data = readJSON(path.join(writingDir, file));
    const slug = file.replace('.json', '');

    const targetDir = path.join(APP_CONTENT, 'writing', slug);
    ensureDir(targetDir);

    const meta = {
      id: slug,
      title: data.title || slug,
      level: (data.level || '').toLowerCase(),
    };
    fs.writeFileSync(path.join(targetDir, 'meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

    const mdxParts = ['---'];
    mdxParts.push(`title: "${escapeJsString(data.title || slug)}"`);
    mdxParts.push('---');
    mdxParts.push('');
    if (data.content) {
      mdxParts.push(convertMarkdownDirectives(data.content));
    }

    fs.writeFileSync(path.join(targetDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');
    console.log(`  writing: ${slug}`);
  }

  console.log(`Migrated ${files.length} writing tasks`);
}


// ---- CULTURE ----

function migrateCulture() {
  const cultureDir = path.join(SITE_DATA, 'culture');
  const subdirs = fs.readdirSync(cultureDir).filter(f => {
    const p = path.join(cultureDir, f);
    return fs.statSync(p).isDirectory();
  });

  let count = 0;
  for (const subdir of subdirs) {
    const files = fs.readdirSync(path.join(cultureDir, subdir)).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = readJSON(path.join(cultureDir, subdir, file));
      const slug = file.replace('.json', '');

      const targetDir = path.join(APP_CONTENT, 'culture', slug);
      ensureDir(targetDir);

      const meta = {
        id: slug,
        category: subdir,
        title: data.title || slug,
      };
      fs.writeFileSync(path.join(targetDir, 'meta.js'), `export default ${JSON.stringify(meta, null, 2)};\n`);

      const mdxParts = ['---'];
      mdxParts.push(`title: "${escapeJsString(data.title || slug)}"`);
      mdxParts.push(`category: "${subdir}"`);
      mdxParts.push('---');
      mdxParts.push('');
      if (data.content) {
        mdxParts.push(convertMarkdownDirectives(data.content));
      }

      fs.writeFileSync(path.join(targetDir, 'index.ru.mdx'), mdxParts.join('\n') + '\n');
      count++;
      console.log(`  culture: ${subdir}/${slug}`);
    }
  }

  const indexPath = path.join(cultureDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.join(APP_CONTENT, 'culture/index.json'));
  }

  console.log(`Migrated ${count} culture articles`);
}


// ---- VOCABULARY (plain copy, stays as JS data) ----

function migrateVocabulary() {
  const vocabDir = path.join(SITE_DATA, 'vocabulary');
  if (!fs.existsSync(vocabDir)) return;

  function copyJsonToJs(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return;
    ensureDir(destDir);
    const files = fs.readdirSync(srcDir);
    for (const f of files) {
      const srcPath = path.join(srcDir, f);
      if (fs.statSync(srcPath).isDirectory()) {
        copyJsonToJs(srcPath, path.join(destDir, f));
      } else if (f.endsWith('.json')) {
        const data = readJSON(srcPath);
        const jsFile = path.join(destDir, f.replace('.json', '.js'));
        fs.writeFileSync(jsFile, `export default ${JSON.stringify(data, null, 2)};\n`);
      }
    }
  }

  copyJsonToJs(vocabDir, path.join(APP_CONTENT, 'vocabulary'));
  console.log('Migrated vocabulary data');
}


// ---- VERBS ----

function migrateVerbs() {
  const verbsDir = path.join(SITE_DATA, 'verbs');
  if (!fs.existsSync(verbsDir)) return;

  const files = fs.readdirSync(verbsDir).filter(f => f.endsWith('.json'));
  ensureDir(path.join(APP_CONTENT, 'verbs'));
  for (const f of files) {
    const data = readJSON(path.join(verbsDir, f));
    fs.writeFileSync(
      path.join(APP_CONTENT, 'verbs', f.replace('.json', '.js')),
      `export default ${JSON.stringify(data, null, 2)};\n`,
    );
  }
  console.log('Migrated verbs data');
}


// ---- RESOURCES ----

function migrateResources() {
  const resPath = path.join(SITE_DATA, 'resources/index.json');
  if (!fs.existsSync(resPath)) return;

  const data = readJSON(resPath);
  ensureDir(path.join(APP_CONTENT, 'resources'));
  fs.writeFileSync(
    path.join(APP_CONTENT, 'resources/index.js'),
    `export default ${JSON.stringify(data, null, 2)};\n`,
  );
  console.log('Migrated resources');
}


// ---- MAIN ----

console.log('=== Migration: site/data/ -> app/src/content/ ===\n');

console.log('--- Lessons ---');
const lessonMap = migrateLessons();

console.log('\n--- Grammar ---');
migrateGrammar(lessonMap);

console.log('\n--- Tests ---');
migrateTests();

console.log('\n--- Reading ---');
migrateReading();

console.log('\n--- Writing ---');
migrateWriting();

console.log('\n--- Culture ---');
migrateCulture();

console.log('\n--- Vocabulary ---');
migrateVocabulary();

console.log('\n--- Verbs ---');
migrateVerbs();

console.log('\n--- Resources ---');
migrateResources();

console.log('\n=== Done! ===');
