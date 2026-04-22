import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');
const LESSON_FILE_RE = /^[AB][12]-lesson-\d+\.json$/;

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function extractBullets(content) {
  if (typeof content !== 'string') return [];
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = [];
  for (const line of lines) {
    const m = line.match(/^[-*•]\s+(.+)$/);
    if (m) {
      let b = m[1].trim();
      b = b.replace(/^\*\*(.+?)\*\*/, '$1');
      b = b.replace(/\*\*/g, '');
      bullets.push(b);
    }
  }
  return bullets;
}

function extractFromGoalSection(lesson) {
  if (!Array.isArray(lesson.sections)) return [];
  const goalTitles = /^(Цель урока|Цели урока|Goals|Objectives)/i;
  const lessonTitle = String(lesson.title || '').trim().toLowerCase();
  for (const s of lesson.sections) {
    if (!s) continue;
    if (s.type !== 'text' && s.type !== 'grammar') continue;
    const title = String(s.title || '').trim();
    const matchesGoal = goalTitles.test(title);
    const matchesLessonTitle = title.toLowerCase() === lessonTitle;
    if (!matchesGoal && !matchesLessonTitle) continue;
    const bullets = extractBullets(s.content || '');
    if (bullets.length > 0) return bullets;
    const plain = (s.content || '').replace(/\*\*/g, '').trim();
    if (plain) {
      const sentences = plain.split(/(?<=[.!?])\s+/).filter(Boolean).map((s) => s.trim().replace(/[.]$/, ''));
      if (sentences.length > 0) return sentences.slice(0, 4);
    }
  }
  return [];
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR)).filter((f) => LESSON_FILE_RE.test(f)).sort();
  let changed = 0;
  const stillEmpty = [];
  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const lesson = await readJson(filePath);
    const o = Array.isArray(lesson.objectives) ? lesson.objectives : [];
    if (o.length > 0) continue;
    const bullets = extractFromGoalSection(lesson);
    if (bullets.length > 0) {
      lesson.objectives = bullets.slice(0, 7);
      await writeJson(filePath, lesson);
      changed++;
      console.log(`  ${file}: filled ${lesson.objectives.length} objectives`);
    } else {
      stillEmpty.push(file);
    }
  }
  console.log(`\nFilled: ${changed}`);
  if (stillEmpty.length > 0) {
    console.log(`Still empty (${stillEmpty.length}):`);
    stillEmpty.forEach((f) => console.log(`  ${f}`));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
