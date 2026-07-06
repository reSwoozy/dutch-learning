import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://asakaze.github.io',
  base: process.env.BASE_PATH || '/',
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      alias: { '@': '/src' },
    },
  },
});
