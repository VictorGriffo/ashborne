import missoes from '../../data/missoes.json';
import { allSet } from './conditions';
import type { Flags } from './Flags';

export interface QuestStep {
  texto: string;
  /** Área onde o mapa põe o marcador. */
  area: string;
  /** Flag (ou flags, todas) que concluem a etapa. */
  concluida: string | string[];
}

export interface QuestData {
  nome: string;
  etapas: QuestStep[];
}

const QUESTS = Object.entries(missoes).filter(([id]) => !id.startsWith('_')) as Array<[string, QuestData]>;

export interface ActiveQuest {
  id: string;
  quest: QuestData;
  stepIndex: number;
  step: QuestStep;
}

/** A missão ativa: a primeira, em ordem, com alguma etapa pendente. */
export function activeQuest(flags: Flags): ActiveQuest | null {
  for (const [id, quest] of QUESTS) {
    const stepIndex = quest.etapas.findIndex((s) => !allSet(flags, s.concluida));
    if (stepIndex >= 0) return { id, quest, stepIndex, step: quest.etapas[stepIndex] };
  }
  return null;
}
