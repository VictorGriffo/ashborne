import lojas from '../../../data/lojas.json';
import { item } from '../../systems/items';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

interface ShopData {
  nome: string;
  saudacao: string;
  itens: string[];
}

const SHOPS = lojas as Record<string, ShopData>;

/** Loja: comprar e vender com Brasas. A venda paga metade do preço. */
export class ShopState implements GameState {
  readonly name = 'Loja';
  readonly overlay = true;
  private readonly data: ShopData;
  private readonly screen: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private readonly wallet: HTMLParagraphElement;
  private readonly menuEl: HTMLDivElement;
  private menu!: MenuList;
  private mode: 'inicio' | 'comprar' | 'vender' = 'inicio';
  private closed = false;

  constructor(
    private readonly ctx: GameContext,
    shopId: string,
  ) {
    const data = SHOPS[shopId];
    if (!data) throw new Error(`Loja não encontrada em lojas.json: ${shopId}`);
    this.data = data;
    this.screen = el('div', 'screen menu-screen');
    const panel = el('div', 'panel shop');
    this.message = el('p', 'save-message', data.saudacao);
    this.wallet = el('p', 'save-info');
    this.menuEl = el('div');
    panel.append(el('h2', undefined, data.nome), this.message, this.wallet, this.menuEl);
    this.screen.append(panel);
    this.home();
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
      if (this.mode === 'inicio') this.close();
      else this.home();
      return;
    }
    this.menu.handle(input);
  }

  private home(): void {
    this.mode = 'inicio';
    this.setMenu([
      { label: 'Comprar', action: () => this.buyList() },
      { label: 'Vender', action: () => this.sellList() },
      { label: 'Sair', action: () => this.close() },
    ]);
  }

  private buyList(keep = 0): void {
    this.mode = 'comprar';
    const player = this.ctx.player;
    this.setMenu(
      [
        ...this.data.itens.map((id) => {
          const data = item(id);
          const price = data.preco ?? 0;
          return {
            label: `${data.nome} · ${price} Brasas${player.itemCount(id) ? ` (tem ${player.itemCount(id)})` : ''}`,
            action: () => {
              if (player.brasas < price) {
                this.message.textContent = 'Brasas insuficientes. O Bram cruza os braços.';
                return;
              }
              player.brasas -= price;
              player.addItem(id);
              this.message.textContent = `Você comprou ${data.nome}.`;
              this.buyList(this.menu.selectedIndex);
            },
          };
        }),
        { label: 'Voltar', action: () => this.home() },
      ],
      keep,
    );
  }

  private sellList(keep = 0): void {
    this.mode = 'vender';
    const player = this.ctx.player;
    const sellable = [...player.inventory.keys()].filter((id) => (item(id).preco ?? 0) > 0);
    this.setMenu(
      [
        ...sellable.map((id) => {
          const data = item(id);
          const value = Math.max(1, Math.floor((data.preco ?? 0) / 2));
          return {
            label: `${data.nome} ×${player.itemCount(id)} · vende por ${value}`,
            action: () => {
              if (!player.consume(id)) return;
              player.brasas += value;
              this.message.textContent = `Você vendeu ${data.nome} por ${value} Brasas.`;
              this.sellList(this.menu.selectedIndex);
            },
          };
        }),
        { label: sellable.length ? 'Voltar' : 'Nada para vender · Voltar', action: () => this.home() },
      ],
      keep,
    );
  }

  private setMenu(items: MenuItem[], keep = 0): void {
    this.menu = new MenuList(items);
    this.menuEl.replaceChildren(this.menu.el);
    this.menu.selectIndex(keep);
    this.wallet.textContent = `Suas Brasas: ${this.ctx.player.brasas}`;
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
  }
}
