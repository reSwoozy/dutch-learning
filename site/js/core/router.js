import { App } from './app.js';

Object.assign(App, {
  route(hash) {
    const parts = hash.replace('#', '').split('/');
    let page = parts[0] || 'home';
    const param = parts[1] || null;

    if (page === 'progress') page = 'account';

    this.updateActiveNav(page);

    const main = document.getElementById('main-content');
    main.innerHTML = '';
    main.classList.add('fade-in');
    setTimeout(() => main.classList.remove('fade-in'), 300);

    switch (page) {
      case 'home': this.renderHome(main); break;
      case 'lessons': param ? this.renderLesson(main, param) : this.renderLessons(main); break;
      case 'grammar': param ? this.renderGrammarTopic(main, param) : this.renderGrammar(main); break;
      case 'flashcards': this.renderFlashcards(main, param); break;
      case 'verbs': this.renderVerbs(main); break;
      case 'culture': param ? this.renderCultureArticle(main, param) : this.renderCulture(main); break;
      case 'tests': param ? this.renderTest(main, param) : this.renderTests(main); break;
      case 'account': this.renderAccount(main); break;
      case 'reading': param ? this.renderReadingText(main, param) : this.renderReading(main); break;
      case 'writing': param ? this.renderWritingItem(main, param) : this.renderWriting(main); break;
      case 'resources': this.renderResources(main); break;
      default: this.renderHome(main);
    }

    this.currentPage = page;
  },
});
