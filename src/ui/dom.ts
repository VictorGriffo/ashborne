/** Cria um elemento com classe e texto opcionais. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Mostra uma tela com fade de entrada. */
export function fadeIn(parent: HTMLElement, screen: HTMLElement): void {
  parent.append(screen);
  // Força o navegador a registrar o estado inicial antes da transição.
  void screen.offsetWidth;
  screen.classList.add('visible');
}

/** Esconde uma tela com fade de saída e a remove do DOM. */
export function fadeOut(screen: HTMLElement, ms = 450): void {
  screen.classList.remove('visible');
  screen.style.pointerEvents = 'none';
  window.setTimeout(() => screen.remove(), ms);
}
