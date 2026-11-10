import { formatPlayTime } from '../../systems/SaveGame';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

export interface TravelDestination {
  id: string;
  name: string;
  areaName: string;
}

export interface SavePointOptions {
  name: string;
  areaName: string;
  /** Grava o jogo. Devolve false se o navegador recusar. */
  save(): boolean;
  /** Outros pontos de save já visitados. */
  destinations: TravelDestination[];
  travel(dest: TravelDestination): void;
}

/**
 * Ponto de save: o Aether cura o Ryben, e dá para salvar ou viajar
 * para outro ponto já visitado (viagem rápida).
 */
export class SavePointState implements GameState {
  readonly name = 'Ponto de save';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly menuEl: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private readonly info: HTMLParagraphElement;
  private menu!: MenuList;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    private readonly opts: SavePointOptions,
  ) {
    this.screen = el('div', 'screen menu-screen');
    const panel = el('div', 'panel savepoint');
    this.message = el('p', 'save-message', 'O Aether pulsa sob seus dedos. Sua vida foi restaurada.');
    this.info = el('p', 'save-info');
    this.menuEl = el('div');
    panel.append(el('h2', undefined, opts.name), this.message, this.info, this.menuEl);
    this.screen.append(panel);
    this.refreshInfo();
    this.mainMenu();
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen, 200);
  }

  update(): void {
    const input = this.ctx.input;
    if (input.pressed('cancel') || input.pressed('pause')) {
      this.close();
      return;
    }
    this.menu.handle(input);
  }

  private mainMenu(): void {
    const items: MenuItem[] = [{ label: 'Salvar', action: () => this.doSave() }];
    if (this.opts.destinations.length > 0) items.push({ label: 'Viagem rápida', action: () => this.travelMenu() });
    items.push({ label: 'Sair', action: () => this.close() });
    this.setMenu(items);
  }

  private travelMenu(): void {
    this.message.textContent = 'Para onde o Aether deve levar você?';
    this.setMenu([
      ...this.opts.destinations.map((d) => ({
        label: `${d.name} · ${d.areaName}`,
        action: () => {
          if (this.close()) this.opts.travel(d);
        },
      })),
      { label: 'Voltar', action: () => this.mainMenu() },
    ]);
  }

  private doSave(): void {
    const ok = this.opts.save();
    this.message.textContent = ok
      ? 'Jogo salvo. O brilho do cristal guarda este momento.'
      : 'Não foi possível salvar: o navegador recusou (modo anônimo ou sem espaço).';
    this.refreshInfo();
  }

  private refreshInfo(): void {
    const p = this.ctx.player;
    this.info.textContent = `Ryben · NV ${p.level} · ${this.opts.areaName} · ${formatPlayTime(p.playTime)}`;
  }

  private setMenu(items: MenuItem[]): void {
    this.menu = new MenuList(items);
    this.menuEl.replaceChildren(this.menu.el);
  }

  private close(): boolean {
    if (this.closed) return false;
    this.closed = true;
    this.ctx.states.pop();
    return true;
  }
}
