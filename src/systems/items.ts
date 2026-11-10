import itens from '../../data/itens.json';

/** Formato de data/itens.json. */
export interface ItemData {
  nome: string;
  tipo: 'cura' | 'arma' | 'vestes' | 'amuleto' | 'chave';
  descricao: string;
  cura?: number;
  ataque?: number;
  defesa?: number;
  preco?: number;
  /** Texto mostrado ao usar o item. */
  usar?: string;
}

export const ITEMS = itens as Record<string, ItemData>;

export function item(id: string): ItemData {
  const data = ITEMS[id];
  if (!data) throw new Error(`Item não encontrado em itens.json: ${id}`);
  return data;
}
