import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

const CHECK_TYPES = new Set(['text', 'grammar', 'culture']);

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();
  let total = 0;
  for (const file of files) {
    const lesson = JSON.parse(await fs.readFile(path.join(LESSONS_DIR, file), 'utf8'));
    if (!Array.isArray(lesson.sections)) continue;
    lesson.sections.forEach((s, i) => {
      if (!s || !CHECK_TYPES.has(s.type)) return;
      const content = (s.content || '').trim();
      const hasTables = Array.isArray(s.tables) && s.tables.length > 0;
      if (!content && !hasTables) {
        console.log(`${file} [${i}] type=${s.type} title="${s.title || ''}"`);
        total++;
      }
    });
  }
  console.log(`\nEmpty sections: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
