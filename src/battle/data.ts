import ataques from '../../data/ataques.json';
import mobs from '../../data/mobs.json';

/** Uma ação do menu Agir. */
export interface ActData {
  nome: string;
  texto: string[];
  /** Texto alternativo quando o inimigo já está calmo. */
  textoCalmo?: string[];
  /** Quanto a ação muda a calma (pode ser negativo). */
  calma: number;
}

/** Formato de data/mobs.json. */
export interface MobData {
  nome: string;
  /** "o" ou "a", para as frases ("Você poupou o Brotinho de Aether"). */
  artigo: string;
  modelo: string;
  vida: number;
  ataque: number;
  defesa: number;
  recompensa: { xp: number; brasas: number };
  recompensaPoupar: { lacos: number; brasas: number };
  calmaParaPoupar: number;
  mapa: { velocidade: number; raioPasseio: number; raioToque: number };
  encontro: string;
  surpresa: string;
  falas: string[];
  falasCalmo: string[];
  textos: string[];
  textosCalmo: string[];
  agir: ActData[];
  ataques: string[];
  ataquesCalmo: string[];
}

/** Uma onda de projéteis dentro de um padrão de ataque. */
export interface WaveData {
  tipo: 'chuva' | 'cortina' | 'leque' | 'mira';
  de: number;
  ate: number;
  intervalo: number;
  velocidade: number;
  raio: number;
  /** chuva: amplitude do balanço lateral. */
  balanco?: number;
  /** cortina: distância entre projéteis e largura do vão. */
  espaco?: number;
  vao?: number;
  /** leque: quantidade, abertura em graus, origem relativa [0..1, 0..1] e se mira na brasa. */
  quantidade?: number;
  abertura?: number;
  origem?: number[];
  mirar?: boolean;
}

/** Formato de data/ataques.json. */
export interface PatternData {
  nome: string;
  duracao: number;
  caixa: number[];
  ondas: WaveData[];
}

const MOBS = mobs as Record<string, MobData>;
const PATTERNS = ataques as unknown as Record<string, PatternData>;

export function mob(id: string): MobData {
  const data = MOBS[id];
  if (!data) throw new Error(`Mob não encontrado em mobs.json: ${id}`);
  return data;
}

export function pattern(id: string): PatternData {
  const data = PATTERNS[id];
  if (!data || id.startsWith('_')) throw new Error(`Padrão não encontrado em ataques.json: ${id}`);
  return data;
}
