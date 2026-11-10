import './style.css';
import { Game } from './core/Game';
import * as session from './core/session';

const canvasHost = document.getElementById('app');
const ui = document.getElementById('ui');
if (!canvasHost || !ui) throw new Error('index.html precisa de #app e #ui');

const game = new Game(canvasHost, ui);
game.start();

// No desenvolvimento, `game` e atalhos de teste ficam acessíveis no console do navegador.
if (import.meta.env.DEV) {
  const w = window as unknown as { game: Game; session: typeof session };
  w.game = game;
  w.session = session;
  // Ferramentas de teste (window.dev). Só entram no modo de desenvolvimento.
  void import('./devtools').then((m) => m.installDevTools(game));
}
