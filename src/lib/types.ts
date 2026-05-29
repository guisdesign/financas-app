export interface Lancamento {
  id: string
  user_id: string
  valor: number
  descricao: string
  categoria: string
  pagamento: string
  data: string
  casa_rio: boolean
  parcelas: number
  rec_id?: string | null
  previsto_key?: string | null
}

export interface Recorrente {
  id: string
  user_id: string
  nome: string
  valor: number
  freq: 'mensal' | 'quinzenal' | 'semanal' | 'trimestral' | 'anual'
  categoria: string
  classe: 'necessario' | 'reduzivel' | 'dispensavel'
  casa_rio: boolean
  mes_ref?: string | null
}

export interface FaturaPaga {
  user_id: string
  cartao: string
  mes_ref: string
  valor: number
  data_pagamento: string
}

export interface OrcamentoMes {
  user_id: string
  mes: string
  valor: number
}

export interface Config {
  user_id: string
  fechamento_sicredi: number
  fechamento_nubank: number
  vencimento_sicredi?: number
  vencimento_nubank?: number
  venc_proximo_sicredi?: boolean
  venc_proximo_nubank?: boolean
  orcamento_default?: number
}

export interface Categoria {
  id: string
  user_id: string
  nome: string
  cor: string
  ordem: number
}

export interface PrevStatus {
  user_id: string
  chave: string
  status: 'pendente' | 'confirmado' | 'pulado'
  lancamento_id?: string | null
}

export const PAGAMENTOS = [
  { nome: 'Sicredi Mastercard Black', short: 'Sicredi', tipo: 'cartao' },
  { nome: 'Nubank Platinum', short: 'Nubank', tipo: 'cartao' },
  { nome: 'Pix', short: 'Pix', tipo: 'outro' },
  { nome: 'Débito', short: 'Débito', tipo: 'outro' },
  { nome: 'Dinheiro', short: 'Dinheiro', tipo: 'outro' },
]

export const CARTOES = PAGAMENTOS.filter(p => p.tipo === 'cartao').map(p => p.nome)

export const FREQ_MES: Record<string, number> = {
  mensal: 1, quinzenal: 2, semanal: 4, trimestral: 1/3, anual: 1/12
}

export const FREQ_LABEL: Record<string, string> = {
  mensal: '1x/mês', quinzenal: '2x/mês', semanal: '4x/mês',
  trimestral: '1x a cada 3 meses', anual: '1x/ano'
}

export const CLASSES = [
  { k: 'necessario', label: '✓ Necessário' },
  { k: 'reduzivel', label: '⚡ Reduzível' },
  { k: 'dispensavel', label: '✗ Dispensável' },
]

export const CATS_DEFAULT: Omit<Categoria, 'user_id'>[] = [
  { id: 'c1', nome: 'Mercado', cor: '#10B981', ordem: 0 },
  { id: 'c2', nome: 'Restaurante', cor: '#F59E0B', ordem: 1 },
  { id: 'c3', nome: 'Combustível', cor: '#EF4444', ordem: 2 },
  { id: 'c4', nome: 'Saúde', cor: '#1FBED6', ordem: 3 },
  { id: 'c5', nome: 'Lazer', cor: '#8B5CF6', ordem: 4 },
  { id: 'c6', nome: 'Viagens', cor: '#06B6D4', ordem: 5 },
  { id: 'c7', nome: 'Assinaturas', cor: '#0E7490', ordem: 6 },
  { id: 'c8', nome: 'Casa', cor: '#EC4899', ordem: 7 },
  { id: 'c9', nome: 'Outros', cor: '#94A3B8', ordem: 8 },
]

export const fmt = (v: number) =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtS = (v: number) =>
  v >= 10000 ? 'R$ ' + (v / 1000).toFixed(1).replace('.', ',') + 'k' : fmt(v)

export const mlbl = (ym: string) => {
  const [y, m] = ym.split('-')
  return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(m)-1] + '/' + y.slice(2)
}

export const mlblFull = (ym: string) => {
  const [y, m] = ym.split('-')
  return ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(m)-1] + ' ' + y
}

export function addMonth(ym: string, n: number): string {
  let [y, m] = ym.split('-').map(Number)
  m += n
  while (m > 12) { m -= 12; y++ }
  while (m < 1) { m += 12; y-- }
  return y + '-' + String(m).padStart(2, '0')
}

// Data local YYYY-MM-DD (não UTC) - corrige bug de fuso horário
export function todayLocal(): string {
  const d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

// Mês local YYYY-MM (não UTC)
export function thisMonthLocal(): string {
  return todayLocal().slice(0, 7)
}
