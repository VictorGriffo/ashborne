import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Assets } from './Assets';

/** Item preso a um osso, emprestado de outro modelo (ex.: a espada do Knight). */
export interface BorrowedItem {
  modelo: string;
  malha: string;
  osso: string;
}

/** Descrição de um personagem em data/personagens.json. */
export interface CharacterData {
  nome: string;
  modelo: string;
  escala: number;
  /** Acessórios do próprio modelo que ficam visíveis; os outros somem. */
  acessorios: string[];
  itens?: BorrowedItem[];
  animacoes: {
    parado: string;
    andando: string;
    correndo: string;
    falando?: string;
  };
  /** Velocidade (m/s) em que as animações de andar e correr batem com os pés. */
  passo: { andando: number; correndo: number };
}

/** Malhas que formam o corpo nos modelos KayKit (filhas diretas do "Rig"). */
const BODY_PARENT = 'Rig';
const CROSSFADE = 0.2;

/**
 * Personagem animado a partir de um modelo com esqueleto.
 * Cada instância tem o próprio esqueleto e o próprio mixer de animação.
 * O modelo olha para +Z.
 */
export class CharacterModel {
  readonly root = new THREE.Group();
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  /** Animação de uma vez só em andamento; a locomoção espera ela acabar. */
  private oneShot?: THREE.AnimationAction;

  constructor(
    assets: Assets,
    readonly data: CharacterData,
  ) {
    const gltf = assets.get(data.modelo);
    const body = cloneSkinned(gltf.scene);
    body.scale.setScalar(data.escala);
    this.root.add(body);
    this.root.name = data.nome;

    // Esconde os acessórios que não estão na lista.
    const keep = new Set(data.acessorios);
    body.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.parent?.name !== BODY_PARENT) o.visible = keep.has(o.name);
    });

    for (const item of data.itens ?? []) this.attachItem(assets, body, item);

    this.mixer = new THREE.AnimationMixer(body);
    for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
    // Animações de uma vez só (playOnce) voltam sozinhas para a de parado.
    this.mixer.addEventListener('finished', (e) => {
      if (e.action !== this.oneShot) return;
      this.oneShot = undefined;
      if (e.action === this.current) this.play(this.data.animacoes.parado, 0.3);
    });
    this.play(data.animacoes.parado, 0);
  }

  /**
   * Troca de animação com uma transição suave.
   * @param timeScale velocidade da animação (1 = normal)
   */
  play(name: string, fade = CROSSFADE, timeScale = 1): void {
    const next = this.actions.get(name);
    if (!next) {
      console.warn(`Animação "${name}" não existe em ${this.data.modelo}`);
      return;
    }
    next.timeScale = timeScale;
    if (next === this.current) return;
    next.reset().play();
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, false);
    else this.current?.stop();
    this.current = next;
  }

  /** Toca uma animação uma vez e volta para a de parado. */
  playOnce(name: string): void {
    const action = this.actions.get(name);
    if (!action) return;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    if (action === this.current) this.current = undefined; // permite repetir o mesmo gesto
    this.play(name, 0.1);
    this.oneShot = action;
  }

  /**
   * Escolhe parado, andando ou correndo pela velocidade,
   * ajustando o ritmo para os pés não deslizarem.
   */
  locomote(speed: number, running: boolean): void {
    const { animacoes, passo } = this.data;
    if (this.oneShot && speed < 0.15) return;
    this.oneShot = undefined;
    if (speed < 0.15) {
      this.play(animacoes.parado);
    } else if (!running || speed < passo.andando * 1.2) {
      this.play(animacoes.andando, CROSSFADE, THREE.MathUtils.clamp(speed / passo.andando, 0.5, 1.6));
    } else {
      this.play(animacoes.correndo, CROSSFADE, THREE.MathUtils.clamp(speed / passo.correndo, 0.6, 1.5));
    }
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  /** Copia uma malha de outro modelo e a prende no osso de mesmo nome. */
  private attachItem(assets: Assets, body: THREE.Object3D, item: BorrowedItem): void {
    const source = assets.get(item.modelo).scene.getObjectByName(item.malha);
    const bone = body.getObjectByName(item.osso);
    if (!source || !bone) {
      console.warn(`Não deu para prender ${item.malha} em ${item.osso}`);
      return;
    }
    const copy = source.clone(true);
    copy.visible = true;
    copy.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    bone.add(copy);
  }
}
