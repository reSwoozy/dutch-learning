import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const base = process.env.BASE_PATH || '/';
const localeHome = `${base.replace(/\/$/, '')}/ru`;

export default defineConfig({
  site: 'https://asakaze.github.io',
  base,
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  redirects: {
    '/': localeHome,
  },
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      alias: { '@': '/src' },
    },
  },
});
