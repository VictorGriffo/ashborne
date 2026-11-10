/**
 * Como cada mob de uma área ficou (pela ordem em que a área os cria).
 * "derrotado" volta ao salvar; "vencido" é um mob único (elite, chefe) que não volta.
 */
export type SavedEnemyState = 'passeando' | 'poupado' | 'derrotado' | 'vencido';

export interface WorldSave {
  descobertas: string[];
  pontosDeSave: string[];
  mobs: Record<string, SavedEnemyState[]>;
}

/**
 * O que mudou no mundo e precisa durar: áreas descobertas (para o mapa),
 * pontos de save visitados (para a viagem rápida) e o estado dos mobs.
 */
export class WorldState {
  readonly discovered = new Set<string>();
  readonly savePoints = new Set<string>();
  private enemies: Record<string, SavedEnemyState[]> = {};

  enemyStates(area: string): SavedEnemyState[] | undefined {
    return this.enemies[area];
  }

  setEnemyStates(area: string, states: SavedEnemyState[]): void {
    this.enemies[area] = states;
  }

  /** Mobs comuns derrotados voltam (ao salvar ou descansar). Os poupados continuam poupados. */
  respawnDefeated(): void {
    for (const list of Object.values(this.enemies)) {
      for (let i = 0; i < list.length; i++) if (list[i] === 'derrotado') list[i] = 'passeando';
    }
  }

  serialize(): WorldSave {
    return {
      descobertas: [...this.discovered],
      pontosDeSave: [...this.savePoints],
      mobs: structuredClone(this.enemies),
    };
  }

  load(s: WorldSave): void {
    this.reset();
    for (const a of s.descobertas ?? []) this.discovered.add(a);
    for (const p of s.pontosDeSave ?? []) this.savePoints.add(p);
    this.enemies = structuredClone(s.mobs ?? {});
  }

  reset(): void {
    this.discovered.clear();
    this.savePoints.clear();
    this.enemies = {};
  }
}
