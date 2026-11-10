import { EQUIP_SLOTS, type EquipSlot } from '../../systems/PlayerState';
import { item } from '../../systems/items';
import { el, fadeIn, fadeOut } from '../../ui/dom';
import { MenuList, type MenuItem } from '../../ui/MenuList';
import type { GameContext } from '../GameContext';
import type { GameState } from '../StateMachine';

const SLOT_NAMES: Record<EquipSlot, string> = { arma: 'Arma', vestes: 'Vestes', amuleto: 'Amuleto' };

/**
 * Bolsa: itens (usar ou equipar), equipamento atual e atributos do Ryben.
 * Abre pela pausa ou pela tecla I.
 */
export class InventoryState implements GameState {
  readonly name = 'Bolsa';
  readonly overlay = true;
  private readonly screen: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly desc: HTMLParagraphElement;
  private readonly feedback: HTMLParagraphElement;
  private readonly equipEl: HTMLDivElement;
  private readonly statsEl: HTMLDivElement;
  private menu!: MenuList;
  private ids: string[] = [];
  private closed = false;

  constructor(private readonly ctx: GameContext) {
    this.screen = el('div', 'screen menu-screen');
    const panel = el('div', 'panel wide bag');
    const close = el('button', 'panel-close', '×');
    close.type = 'button';
    close.tabIndex = -1;
    close.addEventListener('click', () => this.close());

    this.listEl = el('div', 'bag-list');
    const side = el('div', 'bag-side');
    this.desc = el('p', 'bag-desc');
    this.feedback = el('p', 'bag-feedback');
    this.equipEl = el('div', 'bag-equip');
    this.statsEl = el('div', 'bag-stats');
    side.append(this.desc, this.feedback, el('h3', undefined, 'Equipamento'), this.equipEl, el('h3', undefined, 'Ryben'), this.statsEl);

    const body = el('div', 'bag-body');
    body.append(this.listEl, side);
    panel.append(close, el('h2', undefined, 'Bolsa'), body);
    this.screen.append(panel);
    this.rebuild(0);
  }

  enter(): void {
    fadeIn(this.ctx.ui, this.screen);
  }

  exit(): void {
    fadeOut(this.screen, 200);
  }

  update(): void {
    const input = this.ctx.input;
    if (input.pressed('cancel') || input.pressed('pause') || input.pressed('inventory')) {
      this.close();
      return;
    }
    this.menu.handle(input);
  }

  private rebuild(keepIndex: number): void {
    const player = this.ctx.player;
    this.ids = [...player.inventory.keys()];
    const items: MenuItem[] = this.ids.map((id) => {
      const data = item(id);
      const tag = data.tipo === 'cura' ? 'usar' : EQUIP_SLOTS.includes(data.tipo as EquipSlot) ? 'equipar' : '';
      return {
        label: `${data.nome}  ×${player.itemCount(id)}${tag ? `   · ${tag}` : ''}`,
        action: () => this.useItem(id),
      };
    });
    if (items.length === 0) items.push({ label: '(bolsa vazia)', action: () => {} });

    this.menu = new MenuList(items, (i) => this.describe(i));
    this.listEl.replaceChildren(this.menu.el);
    this.menu.selectIndex(keepIndex);
    this.describe(Math.min(keepIndex, items.length - 1));
    this.refreshSide();
  }

  private describe(i: number): void {
    const id = this.ids[i];
    this.desc.textContent = id ? item(id).descricao : 'Nada por aqui. Baús e mercadores guardam coisas úteis.';
  }

  private useItem(id: string): void {
    const player = this.ctx.player;
    const data = item(id);
    const index = this.menu.selectedIndex;
    if (data.tipo === 'cura') {
      if (player.hp >= player.maxHp) {
        this.feedback.textContent = 'Sua vida já está cheia.';
        return;
      }
      const healed = player.useHealing(id) ?? 0;
      this.feedback.textContent = `${data.usar ?? `Você usa ${data.nome}.`} +${healed} de vida.`;
    } else if (EQUIP_SLOTS.includes(data.tipo as EquipSlot)) {
      player.equip(id);
      this.feedback.textContent = `Você equipou ${data.nome}.`;
    } else {
      this.feedback.textContent = 'Isso não dá para usar agora.';
      return;
    }
    this.rebuild(index);
  }

  private refreshSide(): void {
    const p = this.ctx.player;
    this.equipEl.replaceChildren(
      ...EQUIP_SLOTS.map((slot) => {
        const id = p.equipment[slot];
        const row = el('div', 'bag-row');
        row.append(el('span', 'bag-label', SLOT_NAMES[slot]), el('span', undefined, id ? item(id).nome : '—'));
        return row;
      }),
    );
    const next = p.nextLevelXp;
    const rows: Array<[string, string]> = [
      ['Nível', String(p.level)],
      ['Experiência', next === null ? `${p.xp} (máximo)` : `${p.xp} / ${next}`],
      ['Vida', `${p.hp} / ${p.maxHp}`],
      ['Ataque', String(p.attack)],
      ['Defesa', String(p.defense)],
      ['Laços', String(p.lacos)],
      ['Brasas', String(p.brasas)],
    ];
    this.statsEl.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = el('div', 'bag-row');
        row.append(el('span', 'bag-label', label), el('span', undefined, value));
        return row;
      }),
    );
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ctx.states.pop();
  }
}
