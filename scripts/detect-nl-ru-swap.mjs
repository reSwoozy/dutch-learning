import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

const CYRILLIC = /[А-Яа-яЁё]/;
const LATIN = /[A-Za-z]/;

function hasCyrillic(s) {
  return typeof s === 'string' && CYRILLIC.test(s);
}
function hasLatin(s) {
  return typeof s === 'string' && LATIN.test(s);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort();

  const report = [];
  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const lesson = await readJson(filePath);
    if (!Array.isArray(lesson.sections)) continue;
    const issues = [];
    lesson.sections.forEach((section, si) => {
      if (!section || section.type !== 'vocabulary' || !Array.isArray(section.words)) return;
      section.words.forEach((w, wi) => {
        if (!w || typeof w !== 'object') return;
        const nl = w.nl ?? '';
        const ru = w.ru ?? '';
        const nlIsCyr = hasCyrillic(nl);
        const ruIsLat = hasLatin(ru) && !hasCyrillic(ru);
        if (nlIsCyr) {
          issues.push({ si, wi, nl, ru, swapCandidate: ruIsLat });
        }
      });
    });
    if (issues.length > 0) report.push({ file, issues });
  }

  for (const r of report) {
    console.log(`\n=== ${r.file} (${r.issues.length} suspicious rows) ===`);
    for (const it of r.issues) {
      console.log(`  s[${it.si}].w[${it.wi}]  nl="${it.nl}"  ru="${it.ru}"  swap=${it.swapCandidate}`);
    }
  }
  console.log(`\nTotal files with issues: ${report.length}`);
  console.log(`Total suspicious rows:   ${report.reduce((a, r) => a + r.issues.length, 0)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
