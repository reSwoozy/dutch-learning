import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const INDEX_FILE = path.join(LESSONS_DIR, 'index.json');

const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

const stats = {
  filesProcessed: 0,
  filesChanged: 0,
  duplicateGoalsRemoved: 0,
  hintFieldsNormalized: 0,
  sectionCountMismatches: 0,
  sectionCountFixed: 0,
};

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  const body = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, body, 'utf8');
}

function stripDuplicateGoalsSection(lesson) {
  if (!Array.isArray(lesson.sections)) return false;
  const before = lesson.sections.length;
  lesson.sections = lesson.sections.filter(
    (s) => !(s && s.type === 'text' && typeof s.title === 'string' && s.title.trim() === 'Цели урока'),
  );
  const removed = before - lesson.sections.length;
  if (removed > 0) stats.duplicateGoalsRemoved += removed;
  return removed > 0;
}

function normalizeHintFields(lesson) {
  if (!Array.isArray(lesson.sections)) return false;
  let changed = false;
  for (const section of lesson.sections) {
    if (!section || section.type !== 'vocabulary' || !Array.isArray(section.words)) continue;
    const nlSet = new Set(
      section.words.map((w) => (w && typeof w.nl === 'string' ? w.nl.trim() : '')).filter(Boolean),
    );
    for (let i = 0; i < section.words.length; i++) {
      const w = section.words[i];
      if (!w || typeof w !== 'object' || !('hint' in w)) continue;
      const hint = w.hint;
      if (typeof hint !== 'string') continue;
      const trimmed = hint.trim();
      if (trimmed === '' || trimmed === '-') {
        delete w.hint;
        changed = true;
        stats.hintFieldsNormalized++;
        continue;
      }
      if (nlSet.has(trimmed) && trimmed !== (w.nl || '').trim()) {
        delete w.hint;
        changed = true;
        stats.hintFieldsNormalized++;
      }
    }
  }
  return changed;
}

async function processLesson(filePath) {
  const lesson = await readJson(filePath);
  let changed = false;
  if (stripDuplicateGoalsSection(lesson)) changed = true;
  if (normalizeHintFields(lesson)) changed = true;
  if (changed) {
    await writeJson(filePath, lesson);
    stats.filesChanged++;
  }
  stats.filesProcessed++;
  return lesson;
}

async function syncIndexSectionCounts(lessonsById) {
  const index = await readJson(INDEX_FILE);
  let changed = false;
  for (const level of index.levels || []) {
    for (const entry of level.lessons || []) {
      const lesson = lessonsById.get(entry.id);
      if (!lesson) continue;
      const actual = Array.isArray(lesson.sections) ? lesson.sections.length : 0;
      if (entry.sectionCount !== actual) {
        stats.sectionCountMismatches++;
        entry.sectionCount = actual;
        changed = true;
        stats.sectionCountFixed++;
      }
    }
  }
  if (changed) await writeJson(INDEX_FILE, index);
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();

  const lessonsById = new Map();
  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const lesson = await processLesson(filePath);
    if (lesson && lesson.id) lessonsById.set(lesson.id, lesson);
  }

  await syncIndexSectionCounts(lessonsById);

  console.log('normalize-lessons complete:');
  console.log(`  files processed:           ${stats.filesProcessed}`);
  console.log(`  files changed:             ${stats.filesChanged}`);
  console.log(`  duplicate goals removed:   ${stats.duplicateGoalsRemoved}`);
  console.log(`  hint fields cleaned:       ${stats.hintFieldsNormalized}`);
  console.log(`  section-count mismatches:  ${stats.sectionCountMismatches}`);
  console.log(`  section-count fixed:       ${stats.sectionCountFixed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
