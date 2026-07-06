import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

const base = process.env.BASE_PATH || '/';
const baseNoSlash = base.replace(/\/$/, '');
const localeHome = `${baseNoSlash}/ru`;

function rehypeBaseLinks() {
  if (!baseNoSlash) return () => {};
  const visit = (node) => {
    if (
      node.type === 'element' &&
      node.tagName === 'a' &&
      node.properties &&
      typeof node.properties.href === 'string'
    ) {
      const href = node.properties.href;
      if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith(`${baseNoSlash}/`)) {
        node.properties.href = `${baseNoSlash}${href}`;
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };
  return (tree) => visit(tree);
}

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
  markdown: {
    rehypePlugins: [rehypeBaseLinks],
  },
  integrations: [react(), mdx(), sitemap()],
  vite: {
    resolve: {
      alias: { '@': '/src' },
    },
  },
});
