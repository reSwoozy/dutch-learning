import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const contentDir = join(root, 'src/content');
const lessonsDir = join(contentDir, 'lessons');
const vocabLessonsDir = join(contentDir, 'vocabulary/lessons');

const LEVELS = ['a1', 'a2', 'b1', 'b2'];
const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

async function importDefault(file) {
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  return mod.default;
}

function flattenVocab(vocab) {
  const out = [];
  for (const bucket of ['main', 'extra', 'expressions']) {
    if (Array.isArray(vocab?.[bucket])) out.push(...vocab[bucket]);
  }
  return out;
}

async function checkLessons() {
  for (const level of LEVELS) {
    const levelDir = join(lessonsDir, level);
    if (!existsSync(levelDir)) continue;
    const nums = (await readdir(levelDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const num of nums) {
      const id = `${level}/${num}`;
      const metaFile = join(levelDir, num, 'meta.js');
      const mdxFile = join(levelDir, num, 'index.ru.mdx');

      if (!existsSync(metaFile)) {
        err(`[lesson ${id}] missing meta.js`);
        continue;
      }
      const meta = await importDefault(metaFile);
      for (const field of ['id', 'legacyId', 'title', 'level', 'num']) {
        if (meta[field] === undefined || meta[field] === '') {
          err(`[lesson ${id}] meta missing "${field}"`);
        }
      }
      if (meta.id && meta.id !== id) {
        err(`[lesson ${id}] meta.id "${meta.id}" does not match folder`);
      }

      if (!existsSync(mdxFile)) {
        err(`[lesson ${id}] missing index.ru.mdx`);
      } else {
        const mdx = await readFile(mdxFile, 'utf8');
        if (/REFERENCE\//.test(mdx)) {
          err(`[lesson ${id}] broken REFERENCE link in mdx`);
        }
        if (/\]\(\.\.\//.test(mdx)) {
          warn(`[lesson ${id}] relative "../" link in mdx`);
        }
        if (/<ExerciseList/.test(mdx) && !/"answer"|"answers"|"options"|"sample"/.test(mdx)) {
          warn(`[lesson ${id}] ExerciseList without checkable answers`);
        }
      }

      const vocabFile = join(levelDir, num, 'vocab.js');
      if (existsSync(vocabFile) && meta.legacyId) {
        const vocab = await importDefault(vocabFile);
        const words = flattenVocab(vocab).filter((w) => w?.nl);
        const canonicalFile = join(vocabLessonsDir, `${meta.legacyId}.js`);
        if (!existsSync(canonicalFile)) {
          err(`[lesson ${id}] no canonical vocab file ${meta.legacyId}.js`);
        } else {
          const canonical = await importDefault(canonicalFile);
          const canonSet = new Set((canonical || []).map((w) => w.nl));
          for (const w of words) {
            if (!canonSet.has(w.nl)) {
              warn(`[lesson ${id}] display word "${w.nl}" absent from canonical vocab`);
            }
          }
        }
      }
    }
  }
}

async function checkVocab() {
  const index = await importDefault(join(contentDir, 'vocabulary/index.js'));
  const tiers = index.tiers || {};
  for (const entry of tiers.lessons || []) {
    const file = join(vocabLessonsDir, `${entry.id}.js`);
    if (!existsSync(file)) {
      err(`[vocab] missing file for ${entry.id}`);
      continue;
    }
    const words = await importDefault(file);
    if (!Array.isArray(words) || words.length === 0) {
      err(`[vocab] ${entry.id} empty`);
      continue;
    }
    if (entry.wordCount && words.length !== entry.wordCount) {
      warn(`[vocab] ${entry.id} count ${words.length} != index ${entry.wordCount}`);
    }
    let noPron = 0;
    for (const w of words) {
      if (!w.nl) err(`[vocab] ${entry.id} word without nl`);
      if (!w.ru) warn(`[vocab] ${entry.id} word "${w.nl}" without ru`);
      if (!w.pronunciation) noPron++;
    }
    if (noPron > 0) {
      warn(`[vocab] ${entry.id}: ${noPron}/${words.length} words without pronunciation`);
    }
  }
}

async function run() {
  await checkLessons();
  await checkVocab();

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log('  ! ' + w);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log('  x ' + e);
    console.log('\nContent validation FAILED');
    process.exit(1);
  }
  console.log(`\nContent validation passed (${warnings.length} warnings)`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
