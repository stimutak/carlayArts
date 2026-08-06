import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: 'https://carlay-art.com',
  integrations: [
    sitemap({
      filter: (page) => !['/client-a-fournir/', '/panier/', '/commande/', '/confirmation/'].some((path) => page.endsWith(path)),
    }),
  ],
});
