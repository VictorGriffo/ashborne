import type { Action, Input } from '../core/Input';
import { el } from './dom';

/** Distância (px) que o polegar anda até o analógico chegar ao máximo. */
const STICK_RADIUS = 56;
/** Zona morta do analógico, em fração do raio. */
const STICK_DEADZONE = 0.15;

/**
 * Controles de toque para celular deitado.
 *
 * - Analógico: aparece onde o polegar encosta, na metade esquerda da tela.
 *   Empurrar até a borda corre.
 * - A (confirmar / falar) e B (voltar) no canto direito.
 * - Pausa no canto de cima.
 *
 * O modo toque liga sozinho em telas de toque e desliga se alguém usar o teclado.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private pointerId: number | null = null;
  private originX = 0;
  private originY = 0;

  constructor(
    private readonly input: Input,
    parent: HTMLElement,
  ) {
    this.root = el('div', 'touch-controls');
    this.base = el('div', 'touch-stick');
    this.knob = el('div', 'touch-knob');
    this.base.append(this.knob);

    const buttons = el('div', 'touch-buttons');
    buttons.append(this.button('A', 'confirm', 'touch-a'), this.button('B', 'cancel', 'touch-b'));
    const pause = this.button('II', 'pause', 'touch-pause');
    pause.setAttribute('aria-label', 'Pausar');
    const map = this.button('Mapa', 'map', 'touch-map');

    this.root.append(this.base, buttons, pause, map);
    parent.append(this.root);

    if (window.matchMedia('(pointer: coarse)').matches) setTouchMode(true);
    window.addEventListener('pointerdown', this.onDown, { passive: false });
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', () => setTouchMode(false));
  }

  private button(label: string, action: Action, className: string): HTMLButtonElement {
    const b = el('button', `touch-button ${className}`, label);
    b.type = 'button';
    b.tabIndex = -1;
    const release = () => {
      b.classList.remove('down');
      this.input.setVirtual(action, false);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Mantém o botão apertado mesmo se o dedo escorregar para fora dele.
        b.setPointerCapture(e.pointerId);
      } catch {
        // Alguns navegadores recusam a captura; o botão funciona igual.
      }
      b.classList.add('down');
      this.input.setVirtual(action, true);
    });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
    return b;
  }

  private onDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    setTouchMode(true);
    if (this.pointerId !== null) return;
    if (e.clientX > window.innerWidth * 0.5) return;
    // Toques em botões e listas são da interface, não do analógico.
    const target = e.target as HTMLElement;
    if (target.closest('button, .menu, .touch-button')) return;

    this.pointerId = e.pointerId;
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.base.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    this.knob.style.transform = 'translate(0px, 0px)';
    this.base.classList.add('active');
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.originX;
    const dy = e.clientY - this.originY;
    const len = Math.hypot(dx, dy);
    const ux = len > 0 ? dx / len : 0;
    const uy = len > 0 ? dy / len : 0;
    const reach = Math.min(len, STICK_RADIUS);
    this.knob.style.transform = `translate(${ux * reach}px, ${uy * reach}px)`;

    const mag = reach / STICK_RADIUS;
    if (mag < STICK_DEADZONE) {
      this.input.setTouchStick({ x: 0, y: 0 });
      return;
    }
    const scaled = (mag - STICK_DEADZONE) / (1 - STICK_DEADZONE);
    this.input.setTouchStick({ x: ux * scaled, y: -uy * scaled });
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.base.classList.remove('active');
    this.input.setTouchStick({ x: 0, y: 0 });
  };
}

/** Liga ou desliga o visual de toque (controles na tela, textos de toque). */
export function setTouchMode(on: boolean): void {
  document.body.classList.toggle('touch-mode', on);
}

export function isTouchMode(): boolean {
  return document.body.classList.contains('touch-mode');
}

/**
 * No celular, entra em tela cheia e trava na horizontal.
 * Só funciona a partir de um toque do jogador; falhas são ignoradas
 * (alguns navegadores, como o Safari do iPhone, não deixam travar).
 */
export async function enterMobileFullscreen(): Promise<void> {
  if (!isTouchMode() || document.fullscreenElement) return;
  try {
    await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape');
  } catch {
    // Sem tela cheia ou sem trava: o aviso de girar o celular continua valendo.
  }
}
