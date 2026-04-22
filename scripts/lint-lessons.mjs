import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const INDEX_FILE = path.join(LESSONS_DIR, 'index.json');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

const ALLOWED_TYPES = new Set(['text', 'vocabulary', 'grammar', 'exercises', 'culture', 'dialogue']);
const ALLOWED_LEVELS = new Set(['A1', 'A2', 'B1', 'B2']);
const CYRILLIC = /[А-Яа-яЁё]/;

const errors = [];
const warnings = [];

function err(file, msg) {
  errors.push(`${file}: ${msg}`);
}
function warn(file, msg) {
  warnings.push(`${file}: ${msg}`);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function validateLesson(file, lesson) {
  if (!lesson || typeof lesson !== 'object') {
    err(file, 'root is not an object');
    return;
  }
  if (typeof lesson.id !== 'string' || !/^[AB][12]-lesson-\d+$/.test(lesson.id)) {
    err(file, `invalid id: ${JSON.stringify(lesson.id)}`);
  }
  const expectedId = file.replace(/\.json$/, '');
  if (lesson.id && lesson.id !== expectedId) {
    err(file, `id "${lesson.id}" does not match filename`);
  }
  if (!Number.isInteger(lesson.num) || lesson.num < 1) err(file, 'num must be a positive integer');
  if (!ALLOWED_LEVELS.has(lesson.level)) err(file, `invalid level: ${lesson.level}`);
  if (typeof lesson.title !== 'string' || !lesson.title.trim()) err(file, 'missing or empty title');
  if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
    err(file, 'objectives must be a non-empty array');
  } else if (lesson.objectives.length > 7) {
    warn(file, `objectives list is long (${lesson.objectives.length}); consider trimming to 3-7`);
  }
  if (!Array.isArray(lesson.sections) || lesson.sections.length === 0) {
    err(file, 'sections must be a non-empty array');
    return;
  }

  const seenGoalSection = { count: 0 };
  lesson.sections.forEach((s, i) => validateSection(file, lesson, s, i, seenGoalSection));

  if (seenGoalSection.count > 1) {
    err(file, `duplicate "Цели урока" text section (${seenGoalSection.count} occurrences)`);
  }
}

function validateSection(file, lesson, section, index, seenGoalSection) {
  const loc = `sections[${index}]`;
  if (!section || typeof section !== 'object') {
    err(file, `${loc}: not an object`);
    return;
  }
  if (!ALLOWED_TYPES.has(section.type)) {
    err(file, `${loc}: invalid type "${section.type}"`);
    return;
  }
  if (typeof section.title !== 'string' || !section.title.trim()) {
    err(file, `${loc}: missing or empty title`);
  }
  if (section.type === 'text' && typeof section.title === 'string' && section.title.trim() === 'Цели урока') {
    seenGoalSection.count += 1;
  }

  if (section.type === 'vocabulary') {
    if (!Array.isArray(section.words) || section.words.length === 0) {
      err(file, `${loc} (vocabulary "${section.title}"): missing words[]`);
      return;
    }
    const nlValues = new Set();
    section.words.forEach((w, wi) => {
      const wloc = `${loc}.words[${wi}]`;
      if (!w || typeof w !== 'object') {
        err(file, `${wloc}: not an object`);
        return;
      }
      if (typeof w.nl !== 'string' || !w.nl.trim()) err(file, `${wloc}: missing nl`);
      if (typeof w.ru !== 'string' || !w.ru.trim()) err(file, `${wloc}: missing ru`);
      if (typeof w.nl === 'string' && CYRILLIC.test(w.nl)) {
        warn(file, `${wloc}: nl "${w.nl}" contains Cyrillic — likely swapped with ru`);
      }
      if (typeof w.nl === 'string') nlValues.add(w.nl.trim());
      if (typeof w.hint === 'string') {
        const h = w.hint.trim();
        if (h === '' || h === '-') {
          warn(file, `${wloc}: hint is empty/"-" — remove the field`);
        } else if (h !== (w.nl || '').trim() && nlValues.has(h) === false && /^[a-zA-Z]+$/.test(h) && !/\s/.test(h)) {
          // single-token Latin hint that's not an nl elsewhere — likely leaked from another row
          // (soft warning)
        }
      }
    });
  } else if (section.type === 'dialogue') {
    if (!Array.isArray(section.lines) || section.lines.length === 0) {
      err(file, `${loc} (dialogue): missing lines[]`);
    }
  } else if (section.type === 'exercises') {
    const hasItems = Array.isArray(section.items) && section.items.length > 0;
    const hasContent = typeof section.content === 'string' && section.content.trim();
    if (!hasItems && !hasContent) {
      err(file, `${loc} (exercises "${section.title}"): must have items[] or content`);
    }
  } else {
    const hasContent = typeof section.content === 'string' && section.content.trim();
    const hasTables = Array.isArray(section.tables) && section.tables.length > 0;
    const hasExamples = Array.isArray(section.examples) && section.examples.length > 0;
    if (!hasContent && !hasTables && !hasExamples) {
      err(file, `${loc} (${section.type} "${section.title}"): empty — add content/tables/examples`);
    }
  }
}

async function validateIndex(lessonsById) {
  const index = await readJson(INDEX_FILE);
  if (!index || !Array.isArray(index.levels)) {
    err('index.json', 'missing levels[]');
    return;
  }
  for (const level of index.levels) {
    const levelId = level.id || level.level;
    if (!ALLOWED_LEVELS.has(levelId)) err('index.json', `bad level id "${levelId}"`);
    if (!Array.isArray(level.lessons)) {
      err('index.json', `level ${levelId} has no lessons[]`);
      continue;
    }
    for (const entry of level.lessons) {
      const lesson = lessonsById.get(entry.id);
      if (!lesson) {
        err('index.json', `lesson ${entry.id} referenced in index but file not found`);
        continue;
      }
      const actualCount = Array.isArray(lesson.sections) ? lesson.sections.length : 0;
      if (entry.sectionCount !== actualCount) {
        err('index.json', `${entry.id}: sectionCount ${entry.sectionCount} != actual ${actualCount}`);
      }
      if (entry.title !== lesson.title) {
        warn('index.json', `${entry.id}: index title differs from lesson title`);
      }
    }
  }
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();

  const lessonsById = new Map();
  for (const file of files) {
    try {
      const lesson = await readJson(path.join(LESSONS_DIR, file));
      validateLesson(file, lesson);
      if (lesson && lesson.id) lessonsById.set(lesson.id, lesson);
    } catch (e) {
      err(file, `JSON parse error: ${e.message}`);
    }
  }

  await validateIndex(lessonsById);

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  ✖ ${e}`);
    console.log(`\n✖ Lint failed with ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(`\n✓ Lint passed: ${files.length} files, ${warnings.length} warning(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
