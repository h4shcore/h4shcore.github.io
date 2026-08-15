import { defineConfig } from 'astro/config';

// Deployed to https://h4shcore.github.io — user (not project) page,
// so site is served from the domain root and no `base` is needed.
// If this ever moves to a project page (h4shcore.github.io/repo-name),
// set base: '/repo-name' below.
export default defineConfig({
  site: 'https://h4shcore.github.io',
  output: 'static'
});
