import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: here('./index.html'),
        explorer: here('./explorer.html'),
        oracle: here('./oracle.html'),
        compiler: here('./compiler.html'),
        changelog: here('./changelog.html'),
        gallery: here('./gallery.html'),
        tour: here('./tour.html'),
        manual: here('./manual.html'),
        university: here('./university.html'),
        desktop: here('./desktop.html'),
        demands: here('./demands.html'),
        language: here('./language.html'),
      },
    },
  },
});
