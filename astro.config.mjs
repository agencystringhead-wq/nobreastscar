import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Staging URL. Switch to https://nobreastscar.com on launch day (see SPEC §9).
export default defineConfig({
  site: 'https://nobreastscar.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  // Inline the (small) stylesheet so it is not a render-blocking request.
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
