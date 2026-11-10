/**
 * Marcadores de progresso da história ("conversou-com-orin", "selo-1"...).
 * Diálogos e missões leem e escrevem aqui. No M3 isto entra no save.
 */
export class Flags {
  private readonly set_ = new Set<string>();

  has(flag: string): boolean {
    return this.set_.has(flag);
  }

  set(flag: string): void {
    this.set_.add(flag);
  }

  clear(flag: string): void {
    this.set_.delete(flag);
  }

  /** Lista para salvar e para o painel de depuração. */
  list(): string[] {
    return [...this.set_];
  }
}
