/**
 * Entrada por ações, não por teclas.
 *
 * O jogo pergunta por "confirm" ou "up", nunca por "Enter" ou "KeyW".
 * Assim teclado e controle funcionam juntos, e trocar teclas depois
 * só mexe no mapa abaixo.
 *
 * Toques curtos não se perdem: um aperto que começa e termina entre dois
 * passos de lógica ainda conta como `pressed` no passo seguinte.
 */
export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'run'
  | 'confirm'
  | 'cancel'
  | 'pause'
  | 'map'
  | 'inventory'
  | 'debug'
  | 'lookLeft'
  | 'lookRight'
  | 'recenter';

const KEYMAP: Record<string, Action[]> = {
  KeyW: ['up'],
  ArrowUp: ['up'],
  KeyS: ['down'],
  ArrowDown: ['down'],
  KeyA: ['left'],
  ArrowLeft: ['left'],
  KeyD: ['right'],
  ArrowRight: ['right'],
  ShiftLeft: ['run'],
  ShiftRight: ['run'],
  Enter: ['confirm'],
  NumpadEnter: ['confirm'],
  Space: ['confirm'],
  KeyZ: ['confirm'],
  KeyX: ['cancel'],
  Escape: ['pause', 'cancel'],
  KeyP: ['pause'],
  KeyM: ['map'],
  Tab: ['map'],
  KeyI: ['inventory'],
  F3: ['debug'],
  KeyQ: ['lookLeft'],
  KeyE: ['lookRight'],
  KeyC: ['recenter'],
};

/** Quanto a câmera gira por pixel arrastado (radianos). */
const DRAG_SENSITIVITY = 0.006;

/** Botões no layout padrão da Gamepad API (Xbox / PlayStation). */
const PAD_BUTTONS: Array<[number, Action]> = [
  [0, 'confirm'], // A / ×
  [1, 'cancel'], // B / ○
  [2, 'run'], // X / □
  [3, 'inventory'], // Y / △
  [8, 'map'], // Back / Share
  [9, 'pause'], // Start / Options
  [11, 'recenter'], // R3
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
];

const STICK_DEADZONE = 0.2;
/** Comprimento do analógico de toque a partir do qual o Ryben corre. */
const TOUCH_RUN_THRESHOLD = 0.92;

export interface Vec2 {
  x: number;
  y: number;
}

export class Input {
  private readonly keysDown = new Set<Action>();
  private readonly heldCodes = new Set<string>();
  private readonly queued = new Set<Action>();
  private readonly pressedNow = new Set<Action>();

  private readonly padDown = new Set<Action>();
  private padPrev = new Set<Action>();
  private stick: Vec2 = { x: 0, y: 0 };

  /** Botões de toque na tela, segurados agora. */
  private readonly virtualDown = new Set<Action>();
  /** Analógico de toque. */
  private touchStick: Vec2 = { x: 0, y: 0 };

  /** Giro da câmera vindo de arrastar o mouse ou o dedo, acumulado até ser lido. */
  private lookDrag: Vec2 = { x: 0, y: 0 };
  private zoomDelta = 0;
  private rightStick: Vec2 = { x: 0, y: 0 };
  private dragPointer: number | null = null;
  private dragLast: Vec2 = { x: 0, y: 0 };

  constructor(target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.clear);
  }

  /**
   * Liga o giro da câmera a um elemento (o canvas do jogo): arrastar com o
   * mouse gira; no toque, só a metade direita da tela gira (a esquerda é o
   * analógico de andar). A roda do mouse aproxima e afasta.
   */
  attachLook(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      if (this.dragPointer !== null) return;
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth / 2) return;
      this.dragPointer = e.pointerId;
      this.dragLast = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.dragPointer) return;
      this.lookDrag.x += (e.clientX - this.dragLast.x) * DRAG_SENSITIVITY;
      this.lookDrag.y += (e.clientY - this.dragLast.y) * DRAG_SENSITIVITY;
      this.dragLast = { x: e.clientX, y: e.clientY };
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId === this.dragPointer) this.dragPointer = null;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomDelta += Math.sign(e.deltaY);
      },
      { passive: false },
    );
  }

  /**
   * Giro da câmera neste passo: x gira em volta do Ryben, y inclina.
   * Junta o arrastar (em radianos, já pronto) com teclas e analógico (por segundo).
   */
  lookVector(dt: number): Vec2 {
    let x = this.lookDrag.x;
    let y = this.lookDrag.y;
    this.lookDrag = { x: 0, y: 0 };
    const keys = (this.down('lookRight') ? 1 : 0) - (this.down('lookLeft') ? 1 : 0);
    x += (keys * 2.4 + this.rightStick.x * 3) * dt;
    y += this.rightStick.y * 1.6 * dt;
    return { x, y };
  }

  /** Passos da roda do mouse desde a última leitura (positivo = afastar). */
  takeZoom(): number {
    const z = this.zoomDelta;
    this.zoomDelta = 0;
    return z;
  }

  /** Chamado no início de cada passo de lógica. */
  beginStep(): void {
    this.pollGamepad();
    this.pressedNow.clear();
    for (const a of this.queued) this.pressedNow.add(a);
    this.queued.clear();
  }

  /** A ação está sendo segurada. */
  down(action: Action): boolean {
    if (this.keysDown.has(action) || this.padDown.has(action) || this.virtualDown.has(action)) return true;
    // No toque, empurrar o analógico até a borda é correr.
    return action === 'run' && Math.hypot(this.touchStick.x, this.touchStick.y) > TOUCH_RUN_THRESHOLD;
  }

  /** A ação começou neste passo. */
  pressed(action: Action): boolean {
    return this.pressedNow.has(action);
  }

  /** Dispara uma ação por fora do teclado (cliques e toques na interface). */
  trigger(action: Action): void {
    this.queued.add(action);
  }

  /** Botão de toque apertado ou solto. */
  setVirtual(action: Action, down: boolean): void {
    if (down) {
      if (!this.virtualDown.has(action)) this.queued.add(action);
      this.virtualDown.add(action);
    } else {
      this.virtualDown.delete(action);
    }
  }

  /** Posição do analógico de toque (x para a direita, y para cima, comprimento até 1). */
  setTouchStick(v: Vec2): void {
    this.touchStick = v;
  }

  /**
   * Direção de movimento: x para a direita, y para cima.
   * O comprimento vai de 0 a 1 (o analógico permite andar devagar).
   */
  moveVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y += 1;
    if (this.down('down')) y -= 1;

    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    if (this.touchStick.x !== 0 || this.touchStick.y !== 0) return { ...this.touchStick };
    return { ...this.stick };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const actions = KEYMAP[e.code];
    if (!actions) return;
    e.preventDefault();
    if (this.heldCodes.has(e.code)) return; // repetição automática do teclado
    this.heldCodes.add(e.code);
    for (const a of actions) {
      this.keysDown.add(a);
      this.queued.add(a);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const actions = KEYMAP[e.code];
    if (!actions) return;
    e.preventDefault();
    this.heldCodes.delete(e.code);
    // Só solta a ação se nenhuma outra tecla ligada a ela continuar segurada.
    for (const a of actions) {
      const stillHeld = [...this.heldCodes].some((code) => KEYMAP[code]?.includes(a));
      if (!stillHeld) this.keysDown.delete(a);
    }
  };

  private clear = (): void => {
    this.heldCodes.clear();
    this.keysDown.clear();
    this.virtualDown.clear();
    this.touchStick = { x: 0, y: 0 };
  };

  private pollGamepad(): void {
    this.padDown.clear();
    this.stick = { x: 0, y: 0 };

    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p) => p?.connected);
    if (pad) {
      for (const [index, action] of PAD_BUTTONS) {
        if (pad.buttons[index]?.pressed) this.padDown.add(action);
      }
      const sx = pad.axes[0] ?? 0;
      const sy = -(pad.axes[1] ?? 0);
      const len = Math.hypot(sx, sy);
      if (len > STICK_DEADZONE) {
        // Remapeia para que o fim da zona morta seja 0 e a borda seja 1.
        const scaled = Math.min(1, (len - STICK_DEADZONE) / (1 - STICK_DEADZONE));
        this.stick = { x: (sx / len) * scaled, y: (sy / len) * scaled };
      }
      // Analógico direito: câmera.
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      const rlen = Math.hypot(rx, ry);
      this.rightStick = rlen > STICK_DEADZONE ? { x: rx, y: ry } : { x: 0, y: 0 };
    } else {
      this.rightStick = { x: 0, y: 0 };
    }

    for (const a of this.padDown) {
      if (!this.padPrev.has(a)) this.queued.add(a);
    }
    this.padPrev = new Set(this.padDown);
  }
}
