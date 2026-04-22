import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'site/data/lessons');

const CANONICAL_TITLES = {
  'A1-lesson-01': 'Знакомство и базовые фразы',
  'A1-lesson-02': 'Артикли de/het и род существительных',
  'A1-lesson-03': 'Личные местоимения и глагол zijn',
  'A1-lesson-04': 'Числа и время',
  'A1-lesson-05': 'Семья и описание людей',
  'A1-lesson-06': 'Еда и напитки',
  'A1-lesson-07': 'Дом и мебель',
  'A1-lesson-08': 'Одежда и цвета',
  'A1-lesson-09': 'Транспорт и город',
  'A1-lesson-10': 'Работа и профессии',
  'A1-lesson-11': 'Хобби и свободное время',
  'A1-lesson-12': 'Погода и времена года',
  'A2-lesson-13': 'Настоящее время глаголов',
  'A2-lesson-14': 'Покупки и деньги',
  'A2-lesson-15': 'Здоровье и тело',
  'A2-lesson-16': 'Путешествия и отпуск',
  'A2-lesson-17': 'Прошедшее время (Perfectum)',
  'A2-lesson-18': 'Модальные глаголы',
  'A2-lesson-19': 'Сравнения и степени сравнения',
  'A2-lesson-20': 'Предлоги места и времени',
  'A2-lesson-21': 'Будущее время',
  'A2-lesson-22': 'Телефонные разговоры',
  'A2-lesson-23': 'Образование и учёба',
  'A2-lesson-24': 'Повторение A2 и подготовка к B1',
  'B1-lesson-25': 'Сложные предложения и союзы',
  'B1-lesson-26': 'Условные предложения',
  'B1-lesson-27': 'Пассивный залог',
  'B1-lesson-28': 'Работа и карьера',
  'B1-lesson-29': 'Банки и финансы',
  'B1-lesson-30': 'Жильё и аренда',
  'B1-lesson-31': 'Правительство и законы',
  'B1-lesson-32': 'Медицинская помощь',
  'B1-lesson-33': 'Социальные услуги',
  'B1-lesson-34': 'Интеграция в общество',
  'B1-lesson-35': 'СМИ и новости',
  'B1-lesson-36': 'Итоговый урок B1 и подготовка к B2',
  'B2-lesson-37': 'Дискурсивные маркеры и связность текста',
  'B2-lesson-38': 'Формальное письмо и отчёт',
  'B2-lesson-39': 'Дебаты и аргументация',
  'B2-lesson-40': 'Косвенные вопросы и вежливые запросы',
  'B2-lesson-41': 'Пассив и каузативные конструкции',
  'B2-lesson-42': 'Косвенная речь и согласование времён',
  'B2-lesson-43': 'Аудирование: стратегии и конспектирование',
  'B2-lesson-44': 'Деловое общение: встречи и email',
  'B2-lesson-45': 'Реферат и перефразирование',
  'B2-lesson-46': 'Интегрированные задания',
  'B2-lesson-47': 'Презентации и публичная речь',
  'B2-lesson-48': 'Итоговый урок B2 и подготовка к экзамену',
  'A1-lesson-49': 'Повелительное наклонение (Imperatief)',
  'A2-lesson-50': 'Инфинитив с te (om te, zonder te, door te)',
  'B1-lesson-51': 'Простое прошедшее (Imperfectum)',
  'B1-lesson-52': 'Относительные местоимения (die/dat/wat)',
  'B2-lesson-53': 'Давнопрошедшее время (Plusquamperfectum)',
};

const EMOJI_RE = /[\p{Extended_Pictographic}\u200D\uFE0F]/gu;
const LESSON_PREFIX_RE = /^\s*Урок\s+\d+\s*[:\.—-]\s*/i;

function stripEmojisAndClean(str) {
  if (typeof str !== 'string') return str;
  let out = str.replace(EMOJI_RE, '');
  out = out.replace(/[ \t]+/g, ' ');
  out = out.replace(/ \n/g, '\n').replace(/\n /g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function normalizeSectionTitle(title, lessonNum) {
  if (typeof title !== 'string') return title;
  let out = stripEmojisAndClean(title);
  out = out.replace(LESSON_PREFIX_RE, '').trim();
  return out;
}

function walk(node, lessonNum) {
  if (Array.isArray(node)) {
    return node.map((item) => walk(item, lessonNum));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'title') {
        out[k] = normalizeSectionTitle(v, lessonNum);
      } else if (k === 'content' || k === 'text') {
        out[k] = stripEmojisAndClean(v);
      } else if (typeof v === 'string') {
        out[k] = stripEmojisAndClean(v);
      } else {
        out[k] = walk(v, lessonNum);
      }
    }
    return out;
  }
  return node;
}

async function processLessonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const id = data.id;
  const canonical = CANONICAL_TITLES[id];
  if (!canonical) {
    console.warn(`  [skip] no canonical title for ${id}`);
    return;
  }
  const lessonNum = data.num;
  data.title = canonical;
  if (Array.isArray(data.objectives)) {
    data.objectives = data.objectives.map((o) => stripEmojisAndClean(o));
  }
  if (Array.isArray(data.sections)) {
    data.sections = data.sections.map((s, idx) => {
      const updated = walk(s, lessonNum);
      if (idx === 0 && updated.title) {
        updated.title = canonical;
      }
      return updated;
    });
  }
  const pretty = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, pretty, 'utf8');
  console.log(`  [ok] ${id} -> "${canonical}"`);
}

async function updateIndex() {
  const indexPath = path.join(LESSONS_DIR, 'index.json');
  const raw = await fs.readFile(indexPath, 'utf8');
  const idx = JSON.parse(raw);
  for (const level of idx.levels) {
    for (const lesson of level.lessons) {
      const canonical = CANONICAL_TITLES[lesson.id];
      if (canonical) {
        lesson.title = canonical;
      }
    }
  }
  await fs.writeFile(indexPath, JSON.stringify(idx, null, 2) + '\n', 'utf8');
  console.log('[ok] updated lessons/index.json');
}

async function main() {
  const files = (await fs.readdir(LESSONS_DIR))
    .filter((f) => /-lesson-\d+\.json$/.test(f))
    .sort();
  console.log(`Processing ${files.length} lesson files...`);
  for (const f of files) {
    await processLessonFile(path.join(LESSONS_DIR, f));
  }
  await updateIndex();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
