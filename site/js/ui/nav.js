import { App } from '../core/app.js';

Object.assign(App, {
  MATERIALS_PAGES: ['flashcards', 'verbs', 'reading', 'writing', 'culture', 'resources'],

  setupNavigation() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    const materials = document.getElementById('nav-materials');

    document.querySelectorAll('nav a').forEach(link => {
      link.addEventListener('click', e => {
        if (link.id === 'nav-search') {
          e.preventDefault();
          this.openSearch();
          this.closeNavDrawer();
          return;
        }
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return;
        e.preventDefault();
        location.hash = hash;
        this.closeNavDrawer();
        if (materials && materials.open && !this.isMobileLayout()) materials.open = false;
      });
    });

    if (burger && drawer) {
      burger.addEventListener('click', () => {
        drawer.classList.contains('open') ? this.closeNavDrawer() : this.openNavDrawer();
      });
    }

    if (scrim) {
      scrim.addEventListener('click', () => this.closeNavDrawer());
    }

    const syncMaterialsState = () => {
      if (!materials) return;
      if (this.isMobileLayout()) {
        materials.open = true;
      } else {
        materials.open = false;
      }
    };

    if (materials) {
      materials.addEventListener('toggle', () => {
        if (this.isMobileLayout() && !materials.open) {
          materials.open = true;
        }
      });
      document.addEventListener('click', (e) => {
        if (!materials.open) return;
        if (materials.contains(e.target)) return;
        if (this.isMobileLayout()) return;
        materials.open = false;
      });
      syncMaterialsState();
    }

    window.addEventListener('resize', () => {
      if (!this.isMobileLayout()) this.closeNavDrawer();
      syncMaterialsState();
    });
  },

  isMobileLayout() {
    return window.matchMedia('(max-width: 860px)').matches;
  },

  openNavDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    if (!drawer || !burger) return;
    drawer.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
    if (scrim) scrim.hidden = false;
  },

  closeNavDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const burger = document.getElementById('nav-burger');
    const scrim = document.getElementById('nav-scrim');
    if (!drawer || !burger) return;
    drawer.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    if (scrim) scrim.hidden = true;
  },

  updateActiveNav(page) {
    const active = `#${page}`;
    document.querySelectorAll('nav a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === active);
    });
    const materialsTrigger = document.querySelector('#nav-materials .nav-group__trigger');
    if (materialsTrigger) {
      materialsTrigger.classList.toggle('active', this.MATERIALS_PAGES.includes(page));
    }
    this.updateHeaderStreak();
  },

  updateHeaderStreak() {
    const wrap = document.getElementById('nav-account-streak');
    const value = document.getElementById('nav-account-streak-value');
    if (!wrap || !value || !this.progress || !this.progress.data) return;
    const streak = this.progress.data.streak || 0;
    if (streak > 0) {
      value.textContent = String(streak);
      wrap.hidden = false;
    } else {
      wrap.hidden = true;
    }
  },
});
