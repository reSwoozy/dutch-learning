import { Progress } from './progress.js';

export const App = {
  currentPage: 'home',
  grammarIndex: null,
  grammarTopics: {},
  lessonsIndex: null,
  vocabIndex: null,
  progress: null,

  async init() {
    this.progress = await Progress.load();
    const [gi, li, vi] = await Promise.all([
      this.fetchJSON('data/grammar/index.json'),
      this.fetchJSON('data/lessons/index.json'),
      this.fetchJSON('data/vocabulary/index.json'),
    ]);
    this.grammarIndex = gi;
    this.lessonsIndex = li;
    this.vocabIndex = vi;
    this.setupNavigation();
    this.setupKeyboardShortcuts();
    this.setupExerciseInteractions();
    this.route(location.hash || '#home');
    window.addEventListener('hashchange', () => this.route(location.hash));
  },

  renderPlaceholder(el, title, description) {
    el.innerHTML = this.pageHero(title, description, []);
  },

  pageHero(title, summary, pills) {
    const pillsHtml = (pills || [])
      .map((p) => `<span class="culture-pill${p.muted ? ' culture-pill--muted' : ''}">${this.escapeHtml(p.text)}</span>`)
      .join('');
    return `<div class="page-hero">
      <h1>${this.escapeHtml(title)}</h1>
      ${summary ? `<p class="page-hero__summary">${this.escapeHtml(summary)}</p>` : ''}
      ${pillsHtml ? `<div class="page-hero__meta">${pillsHtml}</div>` : ''}
    </div>`;
  },

  escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
