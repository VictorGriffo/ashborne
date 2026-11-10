import config from '../../data/config.json';
import personagens from '../../data/personagens.json';
import progressao from '../../data/progressao.json';
import { item, type ItemData } from './items';

export type DifficultyId = keyof typeof config.dificuldades;
export type Difficulty = (typeof config.dificuldades)[DifficultyId];
export type EquipSlot = 'arma' | 'vestes' | 'amuleto';

export const DIFFICULTY_ORDER: DifficultyId[] = ['tranquilo', 'aventura', 'desafio'];
export const EQUIP_SLOTS: EquipSlot[] = ['arma', 'vestes', 'amuleto'];

interface LevelRow {
  nivel: number;
  xp: number;
  vida: number;
  forca: number;
  defesa: number;
  aether: number;
}

const LEVELS: LevelRow[] = progressao.niveis;
const RYBEN = personagens.ryben;

/** Uma subida de nível, para avisar o jogador. */
export interface LevelUp {
  level: number;
  maxHp: number;
  strength: number;
  defense: number;
}

/** O que vai para o save. */
export interface PlayerSave {
  nivel: number;
  xp: number;
  lacos: number;
  brasas: number;
  vida: number;
  dificuldade: DifficultyId;
  tempoDeJogo: number;
  equipamento: Partial<Record<EquipSlot, string>>;
  inventario: Record<string, number>;
  aether?: number;
  nivelMaximo?: number;
}

/**
 * Tudo o que acompanha o Ryben entre áreas e batalhas: vida, nível,
 * equipamento, inventário e as duas trilhas de progressão
 * (experiência, que vem de lutar, e Laços, que vêm de poupar).
 */
export class PlayerState {
  level = 1;
  xp = 0;
  lacos = 0;
  brasas = 0;
  hp = 0;
  /** Aether: o recurso das magias. Só enche depois do primeiro selo. */
  aether = 0;
  /** Nível máximo atual: 12 na Parte 1, 30 na Parte 2. */
  levelCap = progressao.nivelMaximoParte1;
  difficultyId: DifficultyId = 'aventura';
  /** Segundos de jogo, para mostrar no save. */
  playTime = 0;
  equipment: Partial<Record<EquipSlot, string>> = {};
  readonly inventory = new Map<string, number>();

  constructor() {
    this.reset();
  }

  /** Volta ao começo de um jogo novo. Mantém a dificuldade escolhida. */
  reset(): void {
    this.level = RYBEN.atributos.nivel;
    this.xp = 0;
    this.lacos = 0;
    this.brasas = 0;
    this.playTime = 0;
    this.levelCap = progressao.nivelMaximoParte1;
    this.equipment = { ...(RYBEN.equipamento as Partial<Record<EquipSlot, string>>) };
    this.inventory.clear();
    for (const [id, n] of Object.entries(RYBEN.inventario)) this.inventory.set(id, n);
    this.hp = this.maxHp;
    this.aether = this.maxAether;
  }

  /**
   * O salto de nove anos: o Ryben volta mais velho, sem as magias da juventude,
   * no nível 8 e com a Capa do Exílio. Laços, Brasas e itens continuam.
   */
  startPartTwo(): void {
    this.levelCap = LEVELS.length;
    this.level = progressao.nivelAoVoltar;
    this.xp = LEVELS[this.level - 1].xp;
    this.equipment.vestes = 'capa-do-exilio';
    this.addItem('capa-do-exilio');
    this.consume('capa-do-exilio'); // vem já vestida, sem sobrar na bolsa
    this.hp = this.maxHp;
    this.aether = this.maxAether;
  }

  // -- Atributos --------------------------------------------------------------

  private get row(): LevelRow {
    return LEVELS[Math.min(this.level, LEVELS.length) - 1];
  }

  get difficulty(): Difficulty {
    return config.dificuldades[this.difficultyId];
  }

  get maxHp(): number {
    return Math.round(this.row.vida * this.difficulty.vida);
  }

  get strength(): number {
    return this.row.forca;
  }

  get maxAether(): number {
    return this.row.aether;
  }

  /** Força mais o ataque da arma. */
  get attack(): number {
    return this.strength + this.equipped('arma').reduce((n, i) => n + (i.ataque ?? 0), 0);
  }

  /** Defesa do nível mais a das vestes e do amuleto (com o bônus de vida baixa). */
  get defense(): number {
    const low = this.hp <= this.maxHp * 0.3;
    return (
      this.row.defesa +
      this.equipped('vestes', 'amuleto').reduce((n, i) => n + (i.defesa ?? 0) + (low ? (i.defesaVidaBaixa ?? 0) : 0), 0)
    );
  }

  /** Experiência total que falta para o próximo nível, ou null no nível máximo. */
  get nextLevelXp(): number | null {
    return this.level >= this.levelCap ? null : (LEVELS[this.level]?.xp ?? null);
  }

  private equipped(...slots: EquipSlot[]): ItemData[] {
    return slots.map((s) => this.equipment[s]).filter((id): id is string => !!id).map(item);
  }

  // -- Progressão ---------------------------------------------------------------

  /** Soma experiência e sobe de nível quantas vezes der. Devolve as subidas. */
  gainXp(amount: number): LevelUp[] {
    this.xp += amount;
    const ups: LevelUp[] = [];
    while (this.level < this.levelCap && LEVELS[this.level] && this.xp >= LEVELS[this.level].xp) {
      const before = this.maxHp;
      this.level++;
      // A vida ganha no nível já vem cheia.
      this.hp += this.maxHp - before;
      ups.push({ level: this.level, maxHp: this.maxHp, strength: this.strength, defense: this.defense });
    }
    return ups;
  }

  // -- Dificuldade --------------------------------------------------------------

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

  // -- Vida -----------------------------------------------------------------------

  /** Cura considerando a dificuldade. Devolve quanto curou de fato. */
  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(amount * this.difficulty.cura));
    return this.hp - before;
  }

  /** Dano recebido de um ataque com o valor bruto do inimigo. Devolve o dano aplicado. */
  takeHit(enemyAttack: number, factor = 1): number {
    const damage = Math.max(1, Math.round((Math.round(enemyAttack * this.difficulty.dano) - this.defense) * factor));
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  restore(): void {
    this.hp = this.maxHp;
    this.aether = this.maxAether;
  }

  /** Gasta Aether. Devolve false se não houver o bastante. */
  spendAether(amount: number): boolean {
    if (this.aether < amount) return false;
    this.aether -= amount;
    return true;
  }

  gainAether(amount: number): number {
    const before = this.aether;
    this.aether = Math.min(this.maxAether, this.aether + amount);
    return this.aether - before;
  }

  /** Usa um item de Aether (Lágrima). Devolve quanto recuperou, ou null se não deu. */
  useAetherItem(id: string): number | null {
    const data = item(id);
    if (data.tipo !== 'aether' || !this.consume(id)) return null;
    return this.gainAether(data.aether ?? 0);
  }

  // -- Inventário e equipamento -------------------------------------------------

  itemCount(id: string): number {
    return this.inventory.get(id) ?? 0;
  }

  addItem(id: string, amount = 1): void {
    item(id); // falha cedo se o id não existir em itens.json
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

  /** Usa um item de cura fora da batalha. Devolve quanto curou, ou null se não deu. */
  useHealing(id: string): number | null {
    const data = item(id);
    if (data.tipo !== 'cura' || !this.consume(id)) return null;
    return this.heal(data.cura ?? 0);
  }

  /** Equipa um item da bolsa; o que estava no lugar volta para a bolsa. */
  equip(id: string): void {
    const slot = item(id).tipo as EquipSlot;
    if (!EQUIP_SLOTS.includes(slot) || !this.consume(id)) return;
    const previous = this.equipment[slot];
    if (previous) this.addItem(previous);
    const ratio = this.hp / this.maxHp;
    this.equipment[slot] = id;
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(ratio * this.maxHp)));
  }

  // -- Save -------------------------------------------------------------------------

  serialize(): PlayerSave {
    return {
      nivel: this.level,
      xp: this.xp,
      lacos: this.lacos,
      brasas: this.brasas,
      vida: this.hp,
      dificuldade: this.difficultyId,
      tempoDeJogo: Math.round(this.playTime),
      equipamento: { ...this.equipment },
      inventario: Object.fromEntries(this.inventory),
      aether: this.aether,
      nivelMaximo: this.levelCap,
    };
  }

  load(s: PlayerSave): void {
    this.level = Math.max(1, Math.min(LEVELS.length, s.nivel));
    this.xp = s.xp;
    this.lacos = s.lacos;
    this.brasas = s.brasas;
    this.difficultyId = s.dificuldade in config.dificuldades ? s.dificuldade : 'aventura';
    this.playTime = s.tempoDeJogo ?? 0;
    this.equipment = { ...s.equipamento };
    this.inventory.clear();
    for (const [id, n] of Object.entries(s.inventario)) if (n > 0) this.inventory.set(id, n);
    this.levelCap = s.nivelMaximo ?? progressao.nivelMaximoParte1;
    this.hp = Math.max(1, Math.min(this.maxHp, s.vida));
    this.aether = Math.max(0, Math.min(this.maxAether, s.aether ?? this.maxAether));
  }
}
