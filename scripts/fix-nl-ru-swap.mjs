import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

const CYRILLIC = /[А-Яа-яЁё]/;
const LATIN = /[A-Za-z]/;

const hasCyr = (s) => typeof s === 'string' && CYRILLIC.test(s);
const hasLat = (s) => typeof s === 'string' && LATIN.test(s);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();

  let totalSwapped = 0;
  let filesChanged = 0;

  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const lesson = await readJson(filePath);
    if (!Array.isArray(lesson.sections)) continue;
    let changed = false;

    for (const section of lesson.sections) {
      if (!section || section.type !== 'vocabulary' || !Array.isArray(section.words)) continue;
      for (const w of section.words) {
        if (!w || typeof w !== 'object') continue;
        const nl = w.nl ?? '';
        const ru = w.ru ?? '';
        const nlIsCyr = hasCyr(nl);
        const ruIsLat = hasLat(ru) && !hasCyr(ru);
        if (nlIsCyr && ruIsLat) {
          w.nl = ru;
          w.ru = nl;
          totalSwapped++;
          changed = true;
        }
      }
    }

    if (changed) {
      await writeJson(filePath, lesson);
      filesChanged++;
      console.log(`  ${file}: swapped`);
    }
  }

  console.log(`\nFiles changed: ${filesChanged}`);
  console.log(`Total rows swapped: ${totalSwapped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
