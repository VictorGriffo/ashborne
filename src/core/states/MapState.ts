import mapa1 from '../../../data/mapa.json';
import mapa2 from '../../../data/mapa-parte2.json';
import { activeQuest } from '../../systems/Quests';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { savePointArea } from '../../world/areas';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

interface Region {
  id: string;
  nome: string;
  pos: number[];
  futuro?: boolean;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Mapa-múndi: regiões descobertas, onde o Ryben está, pontos de save
 * visitados e o marcador da missão ativa. Abre pela pausa ou pela tecla M.
 */
export class MapState implements GameState {
  readonly name = 'Mapa';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    currentArea: string,
  ) {
    // A Parte 2 tem outro mapa: a mesma geografia, transformada, com sete territórios.
    const mapa = ctx.flags.has('parte-2') ? mapa2 : mapa1;
    this.screen = el('div', 'screen menu-screen');
    const panel = el('div', 'panel wide map-panel');
    const close = el('button', 'panel-close', '×');
    close.type = 'button';
    close.tabIndex = -1;
    close.addEventListener('click', () => this.close());

    const regions = mapa.regioes as Region[];
    const byId = new Map(regions.map((r) => [r.id, r]));
    const known = (r: Region) => !r.futuro && ctx.world.discovered.has(r.id);
    const quest = activeQuest(ctx.flags);
    const savedAreas = new Set([...ctx.world.savePoints].map((id) => savePointArea(id)));

    const board = el('div', 'map-board');

    // Caminhos entre regiões: tracejados até as duas pontas serem conhecidas.
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('map-paths');
    for (const [a, b] of mapa.caminhos) {
      const ra = byId.get(a);
      const rb = byId.get(b);
      if (!ra || !rb) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(ra.pos[0]));
      line.setAttribute('y1', String(ra.pos[1]));
      line.setAttribute('x2', String(rb.pos[0]));
      line.setAttribute('y2', String(rb.pos[1]));
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      if (!(known(ra) && known(rb))) line.classList.add('unknown');
      svg.append(line);
    }
    board.append(svg);

    for (const r of regions) {
      const node = el('div', 'map-node');
      node.style.left = `${r.pos[0]}%`;
      node.style.top = `${r.pos[1]}%`;
      const isKnown = known(r);
      node.classList.toggle('unknown', !isKnown);
      node.classList.toggle('here', r.id === currentArea);
      const dot = el('div', 'map-dot');
      if (savedAreas.has(r.id)) dot.append(el('span', 'map-save', '◆'));
      node.append(dot, el('span', 'map-name', isKnown ? r.nome : '???'));
      if (quest?.step.area === r.id) node.append(el('span', 'map-quest', '✦'));
      if (r.id === currentArea) node.append(el('span', 'map-you', 'Você está aqui'));
      board.append(node);
    }

    const objective = el('p', 'map-objective');
    objective.textContent = quest
      ? `✦ ${quest.quest.nome}: ${quest.step.texto}`
      : 'Nenhuma missão ativa no momento.';
    const legend = el('p', 'map-legend', '● você   ◆ ponto de save   ✦ missão ativa');

    panel.append(close, el('h2', undefined, mapa.titulo), board, objective, legend);
    this.screen.append(panel);
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen, 200);
  }

  update(): void {
    const input = this.ctx.input;
    if (input.pressed('cancel') || input.pressed('pause') || input.pressed('map') || input.pressed('confirm')) {
      this.close();
    }
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
  }
}
