import { App } from '../core/app.js';

Object.assign(App, {
  setupExerciseInteractions() {
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.word-chip');
      if (!chip) return;
      const targetId = chip.dataset.target;
      if (!targetId) return;
      e.preventDefault();
      this.appendWordToInput(targetId, chip.textContent.trim());
    });
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSearch();
        return;
      }
      if (e.key === 'Escape' && this._searchOpen) {
        e.preventDefault();
        this.closeSearch();
        return;
      }

      const target = e.target;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isInput) return;

      if (e.key === '/' && !this._searchOpen) {
        e.preventDefault();
        this.openSearch();
        return;
      }

      if (this.currentPage === 'flashcards' && this._flashcardSession) {
        const session = this._flashcardSession;
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.flipCard();
          return;
        }
        if (session.flipped) {
          if (e.key === '1') { e.preventDefault(); this.rateCard(0); return; }
          if (e.key === '2') { e.preventDefault(); this.rateCard(3); return; }
          if (e.key === '3') { e.preventDefault(); this.rateCard(4); return; }
          if (e.key === '4') { e.preventDefault(); this.rateCard(5); return; }
        }
      }
    });
  },
});
