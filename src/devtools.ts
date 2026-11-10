/**
 * Ferramentas de teste, só no modo de desenvolvimento (npm run dev).
 * Ficam em `window.dev` no console do navegador. Elas rodam o jogo "na mão",
 * passo a passo, sem esperar o relógio, para jogar trechos inteiros em segundos.
 *
 * Exemplos no console:
 *   await dev.ready();  dev.skipToPart2();  dev.go('floresta-de-sylven');
 *   dev.talk('lyra-adulta');  dev.mob('espantalho-vivo');  dev.pedestal();
 */
import type { BattleState } from './battle/BattleState';
import type { Game } from './core/Game';
import * as session from './core/session';
import type { ExploreState } from './core/states/ExploreState';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const PART1_FLAGS = [
  'falou-com-maren', 'conheceu-kael', 'conheceu-lyra', 'conheceu-tob', 'conversou-com-orin',
  'boneco-superado', 'treino-orin-concluido', 'lyra-pediu-ajuda', 'viu-flores-murchas',
  'lyra-ouviu-relato', 'vaelor-proposta', 'maren-deu-amuleto', 'visitou-estrada',
  'visitou-santuario', 'guardiao-superado', 'tocou-coracao', 'parte-1-concluida',
];

const PART2_EARLY_FLAGS = [
  'falou-com-sobrevivente', 'falou-com-lyra', 'falou-com-tob-p2', 'provou-valor',
  'entrou-na-resistencia', 'visitou-campos-de-linne', 'orsa-superada', 'selo-1', 'lyra-soube-do-selo',
];

export function installDevTools(game: Game): void {
  const g = game as Any;

  const step = (n = 1) => {
    for (let i = 0; i < n; i++) g.update(1 / 60);
    g.render(1, 1 / 60);
  };
  const ok = () => {
    game.input.trigger('confirm');
    step(1);
  };
  const explore = (): ExploreState => g.states.stack[0];
  const last = (selector: string) => {
    const all = document.querySelectorAll(selector);
    return all[all.length - 1] as HTMLElement;
  };

  /** Espera o jogo carregar, para o relógio e tira as transições da tela. */
  async function ready(): Promise<string[]> {
    for (let i = 0; i < 160 && game.states.top?.name !== 'Título'; i++) await new Promise((r) => setTimeout(r, 250));
    g.loop.stop();
    const style = document.createElement('style');
    style.textContent =
      '.screen,.controls-hint,.dialogue,.interact-prompt,.area-title,.battle,.arena,.hpbar>div,.touch-stick,.toast,.cinema-bars::before,.cinema-bars::after,.end-line,.end-footer{transition:none!important}.battle-flash,.cinema-flash,.toast-area,.area-title,.debug-hud{display:none!important}';
    document.head.append(style);
    return game.states.names();
  }

  /** Lê um diálogo inteiro, escolhendo sempre a primeira opção. */
  function dialog(max = 60): string[] {
    const lines: string[] = [];
    for (let k = 0; k < max && game.states.top?.name === 'Diálogo'; k++) {
      step(400);
      const box = last('.dialogue');
      const choices = box.querySelectorAll<HTMLElement>('.dialogue-choices button');
      if (choices.length) {
        lines.push(`[escolha] ${choices[0].textContent}`);
        choices[0].click();
        step(1);
        continue;
      }
      const name = box.querySelector<HTMLElement>('.dialogue-name');
      lines.push(`${name && !name.hidden ? `${name.textContent}: ` : ''}${box.querySelector('.dialogue-text')!.textContent}`);
      ok();
    }
    step(2);
    return lines;
  }

  /** Vai até um NPC e conversa com ele. */
  function talk(characterId: string): string[] | string {
    const ex: Any = explore();
    const npc = ex.area.npcs.find((n: Any) => n.characterId === characterId && n.active);
    if (!npc) return `NPC ausente: ${characterId}`;
    ex.player.teleport(npc.position.x, npc.position.z + 1.1, Math.PI);
    step(2);
    if (ex.target?.kind !== 'npc') return `sem alvo perto de ${characterId}`;
    ok();
    return dialog();
  }

  /** Joga uma batalha inteira. 'poupar' acalma e poupa; 'lutar' bate até vencer. O robô não desvia: a vida é restaurada a cada turno. */
  function battle(mode: 'poupar' | 'lutar' = 'poupar'): string[] {
    const out: string[] = [];
    for (let guard = 0; game.states.top?.name === 'Batalha' && guard < 900; guard++) {
      const bs = game.states.top as unknown as Any as BattleState & Any;
      const root: HTMLElement = bs.ui.root;
      const kind = bs.phase.kind;
      if (kind === 'text') {
        step(300);
        out.push(root.querySelector('.arena-text')!.textContent ?? '');
        ok();
      } else if (kind === 'dodge') {
        g.player.hp = g.player.maxHp;
        for (let n = 0; bs.phase.kind === 'dodge' && n < 3000; n++) {
          g.player.hp = g.player.maxHp;
          step(1);
        }
      } else if (kind === 'wait') step(60);
      else if (kind === 'fight') {
        while (bs.phase.bar.cursor < 0.5) step(1);
        ok();
      } else if (kind === 'menu') {
        const buttons = root.querySelectorAll<HTMLElement>('.battle-command');
        if (mode === 'lutar') {
          bs.ui.select(0);
          ok();
        } else if (bs.spareable) {
          buttons[3].click();
          step(1);
          root.querySelectorAll<HTMLElement>('.arena-list button')[0].click();
          step(1);
        } else {
          buttons[1].click();
          step(1);
          const acts = bs.data.agir as Array<{ calma: number }>;
          let best = 0;
          acts.forEach((a, i) => {
            if (a.calma > acts[best].calma) best = i;
          });
          root.querySelectorAll<HTMLElement>('.arena-list button')[best].click();
          step(1);
        }
      } else step(5);
    }
    step(3);
    return [...out.slice(-3), `fim: ${game.states.names().join('>')}`];
  }

  /** Encosta num mob do mapa e luta. */
  function mob(mobId: string, mode: 'poupar' | 'lutar' = 'poupar'): string[] | string {
    const ex: Any = explore();
    const e = ex.area.enemies.find((m: Any) => m.mobId === mobId && m.state === 'passeando');
    if (!e) return `mob ausente ${mobId}`;
    ex.grace = 0;
    ex.player.teleport(e.position.x, e.position.z + 0.5, Math.PI);
    step(1);
    return game.states.top?.name === 'Batalha' ? battle(mode) : 'a batalha não começou';
  }

  /** Vai até o pedestal do selo e restaura (precisa ter superado o general). */
  function pedestal(): string[] {
    const ex: Any = explore();
    const target = ex.area.interactables.find((i: Any) => i.kind === 'examinar' && /selo-restaurar/.test(i.id));
    if (!target) return ['sem pedestal nesta área'];
    ex.grace = 99;
    ex.player.teleport(target.position.x, target.position.z + 1.9, Math.PI);
    step(2);
    ok();
    const lines: string[] = [];
    for (let n = 0; game.states.top?.name !== 'Exploração' && n < 400; n++) {
      step(8);
      if (game.states.top?.name === 'Diálogo') lines.push(...dialog());
    }
    return lines;
  }

  /** Pula a Parte 1 e começa a Parte 2 já sem a cena de abertura. */
  function skipToPart2(): string {
    PART1_FLAGS.forEach((f) => g.flags.set(f));
    localStorage.removeItem('ashborne.save');
    session.startPartTwo(game);
    step(3);
    const ex: Any = explore();
    ex.pendingScene = undefined;
    for (let n = 0; game.states.top?.name !== 'Exploração' && n < 300; n++) {
      step(5);
      if (game.states.top?.name === 'Diálogo') ok();
    }
    return game.states.names().join('>');
  }

  /** Marca os eventos de 2.1 a 2.3 (até o primeiro selo). */
  function firstSeal(): void {
    PART2_EARLY_FLAGS.forEach((f) => g.flags.set(f));
    step(2);
  }

  /** Liga os selos 1 a N e o que vem com eles (generais superados, magias, nível razoável). */
  function seals(n: number): string {
    firstSeal();
    const generals = ['orsa', 'thessaly', 'gorm', 'dravik', 'isolde', 'brannic'];
    for (let k = 1; k <= n; k++) {
      g.flags.set(`selo-${k}`);
      g.flags.set(`${generals[k - 1]}-superad${k === 1 || k === 2 || k === 5 ? 'a' : 'o'}`);
    }
    g.player.gainXp(Math.round(n * 400));
    g.player.restore();
    step(3);
    return `selos 1 a ${n}, nível ${g.player.level}`;
  }

  /** Vai direto para uma área, na entrada indicada. */
  function go(areaId: string, spawn = 'entrada'): string {
    const ex: Any = explore();
    ex.loadArea(areaId, spawn);
    step(8);
    return `${areaId} · NPCs ${ex.area.npcs.map((n: Any) => n.characterId).join(',')} · mobs ${ex.area.enemies.length}`;
  }

  /** Enquadra a câmera num ponto da área, para tirar prints. */
  function look(x: number, z: number, yaw = Math.PI): void {
    const ex: Any = explore();
    ex.player.teleport(x, z, yaw);
    ex.rig.snapTo(ex.player.position);
    step(40);
  }

  /** Estado resumido, para conferir rápido. */
  function status(): Record<string, unknown> {
    const ex: Any = explore();
    return {
      estados: game.states.names().join('>'),
      area: ex.area?.id,
      nivel: g.player.level,
      xp: g.player.xp,
      vida: `${g.player.hp}/${g.player.maxHp}`,
      aether: `${g.player.aether}/${g.player.maxAether}`,
      lacos: g.player.lacos,
      brasas: g.player.brasas,
      missao: ex.currentQuestKey?.(),
      selos: [1, 2, 3, 4, 5, 6, 7].filter((n) => g.flags.has(`selo-${n}`)),
    };
  }

  (window as unknown as { dev: unknown }).dev = {
    game, step, ok, explore, last, ready, dialog, talk, battle, mob, pedestal, skipToPart2, firstSeal, seals, go, look, status,
  };
}
