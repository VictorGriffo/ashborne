import './style.css';
import { Game } from './core/Game';

const canvasHost = document.getElementById('app');
const ui = document.getElementById('ui');
if (!canvasHost || !ui) throw new Error('index.html precisa de #app e #ui');

const game = new Game(canvasHost, ui);
game.start();

// No desenvolvimento, `game` fica acessível no console do navegador.
if (import.meta.env.DEV) {
  (window as unknown as { game: Game }).game = game;
}
