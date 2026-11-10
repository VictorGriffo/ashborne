import { defineConfig } from 'vite';

// No GitHub Pages o jogo fica em https://<usuario>.github.io/ashborne/.
// Se o repositório tiver outro nome, troque o caminho abaixo.
const PAGES_BASE = '/ashborne/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  build: {
    target: 'es2022',
    // O Three.js sozinho passa de 500 kB; o aviso padrão do Vite não ajuda aqui.
    chunkSizeWarningLimit: 1000,
  },
}));
