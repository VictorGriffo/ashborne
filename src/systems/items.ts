import itens from '../../data/itens.json';

/** Formato de data/itens.json. */
export interface ItemData {
  nome: string;
  tipo: 'cura' | 'arma' | 'vestes' | 'amuleto' | 'chave';
  descricao: string;
  cura?: number;
  ataque?: number;
  defesa?: number;
  /** Defesa extra quando a vida está em 30% ou menos (Amuleto de Maren). */
  defesaVidaBaixa?: number;
  /** Preço de compra em Brasas; a venda paga a metade. Sem preço, não se vende. */
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
