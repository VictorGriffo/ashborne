import transportes from '../../../data/transportes.json';
import { check, type Condition } from '../../systems/conditions';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

export interface TransportDestination extends Condition {
  nome: string;
  area: string;
  spawn: string;
}

interface TransportData {
  nome: string;
  saudacao: string;
  preco: number;
  destinos: TransportDestination[];
  /** Conversas e paisagens durante a viagem (uma é sorteada). */
  conversas: string[];
}

const TRANSPORTS = Object.fromEntries(
  Object.entries(transportes).filter(([id]) => !id.startsWith('_')),
) as unknown as Record<string, TransportData>;

/** Resultado de uma escolha: para onde ir e o que mostrar na tela preta. */
export interface TravelChoice {
  area: string;
  spawn: string;
  caption: string;
}

/**
 * Menu de transporte (carroça, barco): lista os destinos já liberados,
 * cobra o preço em Brasas e devolve a escolha para a exploração fazer a cena de viagem.
 */
export class TravelState implements GameState {
  readonly name = 'Transporte';
  readonly overlay = true;
  private readonly data: TransportData;
  private readonly screen: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private readonly wallet: HTMLParagraphElement;
  private readonly menu: MenuList;
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    transportId: string,
    /** Área onde o jogador está agora (não aparece como destino). */
    currentArea: string,
    private readonly onPick: (choice: TravelChoice) => void,
  ) {
    const data = TRANSPORTS[transportId];
    if (!data) throw new Error(`Transporte não encontrado em transportes.json: ${transportId}`);
    this.data = data;

    const options = data.destinos.filter((d) => d.area !== currentArea && check(ctx.flags, d));
    const items: MenuItem[] = options.map((d) => ({
      label: `${d.nome} · ${data.preco} Brasas`,
      action: () => this.pick(d),
    }));
    if (items.length === 0) items.push({ label: 'Ainda não há para onde ir', action: () => {} });
    items.push({ label: 'Sair', action: () => this.close() });
    this.menu = new MenuList(items);

    this.screen = el('div', 'screen menu-screen');
    const panel = el('div', 'panel shop');
    this.message = el('p', 'save-message', data.saudacao);
    this.wallet = el('p', 'save-info', `Suas Brasas: ${ctx.player.brasas}`);
    panel.append(el('h2', undefined, data.nome), this.message, this.wallet, this.menu.el);
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
    if (input.pressed('cancel') || input.pressed('pause')) {
      this.close();
      return;
    }
    this.menu.handle(input);
  }

  private pick(d: TransportDestination): void {
    const player = this.ctx.player;
    if (player.brasas < this.data.preco) {
      this.message.textContent = 'Brasas insuficientes para a viagem.';
      return;
    }
    player.brasas -= this.data.preco;
    const chat = this.data.conversas[Math.floor(Math.random() * this.data.conversas.length)] ?? '';
    this.close();
    this.onPick({ area: d.area, spawn: d.spawn, caption: `${d.nome}\n${chat}` });
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
  }
}
