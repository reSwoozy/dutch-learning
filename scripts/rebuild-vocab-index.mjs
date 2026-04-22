import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VOCAB_DIR = path.join(ROOT, 'site/data/vocabulary');
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const LESSON_FILE_RE = /^([AB][12])-lesson-(\d+)\.json$/;
const LEVEL_FILE_RE = /^([AB][12])\.json$/;

async function readDirSafe(dir) {
  try {
    return await fs.readdir(dir);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse ${filePath}: ${err.message}`);
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function processLessons() {
  const dir = path.join(VOCAB_DIR, 'lessons');
  const files = (await readDirSafe(dir))
    .filter((f) => LESSON_FILE_RE.test(f))
    .sort((a, b) => {
      const [, , aNum] = a.match(LESSON_FILE_RE);
      const [, , bNum] = b.match(LESSON_FILE_RE);
      return parseInt(aNum, 10) - parseInt(bNum, 10);
    });

  const entries = [];
  const allWords = [];
  const counts = { A1: 0, A2: 0, B1: 0, B2: 0 };

  for (const file of files) {
    const m = file.match(LESSON_FILE_RE);
    if (!m) continue;
    const [, level, numStr] = m;
    const lesson = parseInt(numStr, 10);
    const id = `${level}-lesson-${numStr}`;
    const filePath = path.join(dir, file);
    const words = await readJson(filePath);
    if (!Array.isArray(words)) {
      console.warn(`[warn] ${file} is not an array`);
      continue;
    }

    const normalized = words.map((w) => {
      const copy = { ...w };
      if (!copy.level || !/^[AB][12]$/.test(copy.level)) copy.level = level;
      if (copy.lesson == null || Number.isNaN(Number(copy.lesson))) {
        copy.lesson = lesson;
      } else {
        copy.lesson = Number(copy.lesson);
      }
      return copy;
    });

    await writeJson(filePath, normalized);

    entries.push({
      id,
      level,
      lesson,
      wordCount: normalized.length,
      file: `lessons/${file}`,
    });
    for (const w of normalized) {
      counts[w.level] = (counts[w.level] || 0) + 1;
      allWords.push({
        nl: w.nl,
        ru: w.ru,
        level: w.level,
        tier: 'lesson',
        setId: id,
      });
    }
  }

  return { entries, counts, allWords };
}

async function processLevelTier(tierName) {
  const dir = path.join(VOCAB_DIR, tierName);
  const files = (await readDirSafe(dir))
    .filter((f) => LEVEL_FILE_RE.test(f))
    .sort();

  const entries = [];
  const allWords = [];

  for (const file of files) {
    const [, level] = file.match(LEVEL_FILE_RE);
    const filePath = path.join(dir, file);
    const words = await readJson(filePath);
    if (!Array.isArray(words)) {
      console.warn(`[warn] ${tierName}/${file} is not an array`);
      continue;
    }

    const normalized = words.map((w) => {
      const copy = { ...w };
      if (!copy.level || !/^[AB][12]$/.test(copy.level)) copy.level = level;
      return copy;
    });

    await writeJson(filePath, normalized);

    const id = `${tierName}-${level}`;
    entries.push({
      id,
      level,
      wordCount: normalized.length,
      file: `${tierName}/${file}`,
    });
    for (const w of normalized) {
      allWords.push({
        nl: w.nl,
        ru: w.ru,
        level: w.level,
        tier: tierName,
        setId: id,
      });
    }
  }

  return { entries, allWords };
}

async function processThemes() {
  const dir = path.join(VOCAB_DIR, 'themes');
  const files = (await readDirSafe(dir))
    .filter((f) => f.endsWith('.json'))
    .sort();

  const entries = [];
  const allWords = [];
  const themesSet = new Set();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const payload = await readJson(filePath);
    const isEnvelope = payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray(payload.words);
    const words = isEnvelope ? payload.words : payload;
    if (!Array.isArray(words)) {
      console.warn(`[warn] themes/${file} has no words array`);
      continue;
    }

    const slug = file.replace(/\.json$/, '');
    const meta = isEnvelope ? payload : {};
    const title = meta.title || slug;
    const level = meta.level || null;
    const tags = Array.isArray(meta.tags) ? meta.tags : [];

    const normalized = words.map((w) => {
      const copy = { ...w };
      if (!copy.level || !/^[AB][12]$/.test(copy.level)) {
        if (level) copy.level = level;
      }
      if (!copy.theme) copy.theme = slug;
      return copy;
    });

    if (isEnvelope) {
      await writeJson(filePath, { ...meta, words: normalized });
    } else {
      await writeJson(filePath, normalized);
    }

    themesSet.add(slug);
    entries.push({
      id: `themes-${slug}`,
      slug,
      title,
      level,
      tags,
      wordCount: normalized.length,
      file: `themes/${file}`,
    });
    for (const w of normalized) {
      allWords.push({
        nl: w.nl,
        ru: w.ru,
        level: w.level || level || null,
        tier: 'theme',
        setId: `themes-${slug}`,
        theme: slug,
      });
      if (w.theme) themesSet.add(w.theme);
    }
  }

  return { entries, allWords, themesSet };
}

async function main() {
  const lessons = await processLessons();
  const core = await processLevelTier('core');
  const extended = await processLevelTier('extended');
  const themes = await processThemes();

  const combinedCounts = { ...lessons.counts };
  for (const arr of [core.allWords, extended.allWords, themes.allWords]) {
    for (const w of arr) {
      if (!w.level) continue;
      combinedCounts[w.level] = (combinedCounts[w.level] || 0) + 1;
    }
  }

  const totalLessonsWords = Object.values(lessons.counts).reduce((a, b) => a + b, 0);
  const totalWords = Object.values(combinedCounts).reduce((a, b) => a + b, 0);

  const index = {
    totalWords,
    lessonsWordCount: totalLessonsWords,
    levels: combinedCounts,
    themes: Array.from(themes.themesSet).sort(),
    tiers: {
      lessons: lessons.entries,
      core: core.entries,
      extended: extended.entries,
      themes: themes.entries,
    },
  };

  await writeJson(path.join(VOCAB_DIR, 'index.json'), index);

  const searchIndex = [
    ...lessons.allWords,
    ...core.allWords,
    ...extended.allWords,
    ...themes.allWords,
  ];
  await writeJson(path.join(VOCAB_DIR, 'search-index.json'), searchIndex);

  console.log(
    `Rebuilt vocabulary index: ${totalWords} words (lessons ${totalLessonsWords}, core ${core.allWords.length}, extended ${extended.allWords.length}, themes ${themes.allWords.length}).`,
  );
  for (const lvl of LEVELS) {
    console.log(`  ${lvl}: ${combinedCounts[lvl] || 0}`);
  }
  console.log(`  Search-index size: ${searchIndex.length} entries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
