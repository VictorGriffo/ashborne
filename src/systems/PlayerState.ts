import config from '../../data/config.json';
import personagens from '../../data/personagens.json';
import { item } from './items';

export type DifficultyId = keyof typeof config.dificuldades;
export type Difficulty = (typeof config.dificuldades)[DifficultyId];

export const DIFFICULTY_ORDER: DifficultyId[] = ['tranquilo', 'aventura', 'desafio'];

const RYBEN = personagens.ryben;

/**
 * Tudo o que acompanha o Ryben entre áreas e batalhas: vida, atributos,
 * inventário e as duas trilhas de progressão (experiência e Laços).
 * No M3 isto entra no save, e o nível passa a subir com a experiência.
 */
export class PlayerState {
  level = RYBEN.atributos.nivel;
  xp = 0;
  /** Segunda trilha de progressão: cresce ao poupar e conversar. */
  lacos = 0;
  brasas = 0;
  hp: number;
  difficultyId: DifficultyId = 'aventura';

  readonly baseMaxHp = RYBEN.atributos.vida;
  readonly strength = RYBEN.atributos.forca;
  readonly baseDefense = RYBEN.atributos.defesa;
  readonly equipment: Record<string, string> = { ...RYBEN.equipamento };
  readonly inventory = new Map<string, number>(Object.entries(RYBEN.inventario));

  constructor() {
    this.hp = this.maxHp;
  }

  get difficulty(): Difficulty {
    return config.dificuldades[this.difficultyId];
  }

  get maxHp(): number {
    return Math.round(this.baseMaxHp * this.difficulty.vida);
  }

  /** Força mais o ataque da arma. */
  get attack(): number {
    const weapon = this.equipment.arma;
    return this.strength + (weapon ? (item(weapon).ataque ?? 0) : 0);
  }

  /** Defesa base mais a das vestes e do amuleto. */
  get defense(): number {
    let total = this.baseDefense;
    for (const slot of ['vestes', 'amuleto']) {
      const id = this.equipment[slot];
      if (id) total += item(id).defesa ?? 0;
    }
    return total;
  }

  /** Troca a dificuldade mantendo a proporção da vida atual. */
  setDifficulty(id: DifficultyId): void {
    const ratio = this.hp / this.maxHp;
    this.difficultyId = id;
    this.hp = Math.max(1, Math.round(ratio * this.maxHp));
  }

  cycleDifficulty(step = 1): void {
    const i = DIFFICULTY_ORDER.indexOf(this.difficultyId);
    const next = DIFFICULTY_ORDER[(i + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length];
    this.setDifficulty(next);
  }

  /** Cura considerando a dificuldade. Devolve quanto curou de fato. */
  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(amount * this.difficulty.cura));
    return this.hp - before;
  }

  /** Dano recebido de um ataque com o valor bruto do inimigo. Devolve o dano aplicado. */
  takeHit(enemyAttack: number): number {
    const damage = Math.max(1, Math.round(enemyAttack * this.difficulty.dano) - this.defense);
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  restore(): void {
    this.hp = this.maxHp;
  }

  itemCount(id: string): number {
    return this.inventory.get(id) ?? 0;
  }

  addItem(id: string, amount = 1): void {
    this.inventory.set(id, this.itemCount(id) + amount);
  }

  /** Gasta um item. Devolve false se não houver. */
  consume(id: string): boolean {
    const n = this.itemCount(id);
    if (n <= 0) return false;
    if (n === 1) this.inventory.delete(id);
    else this.inventory.set(id, n - 1);
    return true;
  }
}
