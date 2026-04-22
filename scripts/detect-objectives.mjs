import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();

  const empty = [];
  const tooMany = [];
  for (const file of files) {
    const lesson = JSON.parse(await fs.readFile(path.join(LESSONS_DIR, file), 'utf8'));
    const o = Array.isArray(lesson.objectives) ? lesson.objectives : [];
    if (o.length === 0) empty.push({ file, title: lesson.title });
    if (o.length > 7) tooMany.push({ file, title: lesson.title, count: o.length });
  }
  console.log('=== Empty objectives ===');
  for (const e of empty) console.log(`${e.file}  "${e.title}"`);
  console.log(`\n=== Overly long objectives (>7) ===`);
  for (const e of tooMany) console.log(`${e.file}  "${e.title}"  (${e.count})`);
  console.log(`\nTotal empty: ${empty.length}, overly long: ${tooMany.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
