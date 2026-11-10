/**
 * Marcadores de progresso da história ("conversou-com-orin", "visitou-clareira"...).
 * Diálogos e missões leem e escrevem aqui, e tudo vai para o save.
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

  load(flags: string[]): void {
    this.set_.clear();
    for (const f of flags) this.set_.add(f);
  }

  reset(): void {
    this.set_.clear();
  }
}
