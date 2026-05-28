'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import {
  Lancamento, Recorrente, FaturaPaga, Categoria, Config, PrevStatus,
  CATS_DEFAULT, addMonth, FREQ_MES
} from '@/lib/types'

export interface PrevItem {
  rec: Recorrente
  idx: number
  total: number
  key: string
  valor: number
  status: 'pendente' | 'confirmado' | 'pulado'
  lancamentoId?: string | null
}

export function useFinancas(user: User | null) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [recorrentes, setRecorrentes] = useState<Recorrente[]>([])
  const [faturas, setFaturas] = useState<FaturaPaga[]>([])
  const [orcs, setOrcs] = useState<Record<string, number>>({})
  const [cfg, setCfg] = useState<Config>({
    user_id: '', fechamento_sicredi: 5, fechamento_nubank: 25
  })
  const [cats, setCats] = useState<Categoria[]>([])
  const [previstos, setPrevistos] = useState<Record<string, PrevStatus>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(false)

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [rL, rR, rF, rO, rC, rCat, rP] = await Promise.all([
        supabase.from('lancamentos').select('*').eq('user_id', user.id).order('data', { ascending: false }),
        supabase.from('recorrentes').select('*').eq('user_id', user.id),
        supabase.from('faturas_pagas').select('*').eq('user_id', user.id),
        supabase.from('orcamentos_mes').select('*').eq('user_id', user.id),
        supabase.from('config').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('categorias').select('*').eq('user_id', user.id).order('ordem'),
        supabase.from('previstos_status').select('*').eq('user_id', user.id),
      ])

      setLancamentos((rL.data || []) as Lancamento[])
      setRecorrentes((rR.data || []) as Recorrente[])
      setFaturas((rF.data || []) as FaturaPaga[])

      const orcsMap: Record<string, number> = {}
      ;(rO.data || []).forEach((o: any) => { orcsMap[o.mes] = parseFloat(o.valor) })
      if (rC.data?.orcamento_default) orcsMap['default'] = parseFloat(rC.data.orcamento_default)
      setOrcs(orcsMap)

      if (rC.data) {
        setCfg({ user_id: user.id, fechamento_sicredi: rC.data.fechamento_sicredi || 5, fechamento_nubank: rC.data.fechamento_nubank || 25, orcamento_default: rC.data.orcamento_default })
      } else {
        setCfg(c => ({ ...c, user_id: user.id }))
      }

      if (rCat.data && rCat.data.length > 0) {
        setCats(rCat.data as Categoria[])
      } else {
        const defaultCats = CATS_DEFAULT.map(c => ({ ...c, user_id: user.id }))
        await supabase.from('categorias').insert(defaultCats)
        setCats(defaultCats as Categoria[])
      }

      const prevMap: Record<string, PrevStatus> = {}
      ;(rP.data || []).forEach((p: any) => { prevMap[p.chave] = p as PrevStatus })
      setPrevistos(prevMap)

      setSyncError(false)
    } catch (e) {
      console.error('loadAll error:', e)
      setSyncError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadAll() }, [loadAll])

  // ── SAVE HELPERS ──

  async function saveLancamento(l: Lancamento, excluir = false) {
    if (!user) return
    setSyncing(true)
    try {
      if (excluir) {
        await supabase.from('lancamentos').delete().eq('id', l.id).eq('user_id', user.id)
        setLancamentos(prev => prev.filter(x => x.id !== l.id))
      } else {
        await supabase.from('lancamentos').upsert({ ...l, user_id: user.id })
        setLancamentos(prev => {
          const idx = prev.findIndex(x => x.id === l.id)
          if (idx >= 0) { const next = [...prev]; next[idx] = l; return next }
          return [l, ...prev]
        })
      }
      setSyncError(false)
    } catch (e) {
      console.error('saveLancamento error:', e)
      setSyncError(true)
      throw e
    } finally {
      setSyncing(false)
    }
  }

  async function saveRecorrente(r: Recorrente, excluir = false) {
    if (!user) return
    setSyncing(true)
    try {
      if (excluir) {
        await supabase.from('recorrentes').delete().eq('id', r.id).eq('user_id', user.id)
        setRecorrentes(prev => prev.filter(x => x.id !== r.id))
      } else {
        await supabase.from('recorrentes').upsert({ ...r, user_id: user.id })
        setRecorrentes(prev => {
          const idx = prev.findIndex(x => x.id === r.id)
          if (idx >= 0) { const next = [...prev]; next[idx] = r; return next }
          return [...prev, r]
        })
      }
      setSyncError(false)
    } catch (e) {
      setSyncError(true); throw e
    } finally {
      setSyncing(false)
    }
  }

  async function saveFatura(f: FaturaPaga, excluir = false) {
    if (!user) return
    setSyncing(true)
    try {
      if (excluir) {
        await supabase.from('faturas_pagas').delete().eq('user_id', user.id).eq('cartao', f.cartao).eq('mes_ref', f.mes_ref)
        setFaturas(prev => prev.filter(x => !(x.cartao === f.cartao && x.mes_ref === f.mes_ref)))
      } else {
        await supabase.from('faturas_pagas').upsert({ ...f, user_id: user.id })
        setFaturas(prev => {
          const filtered = prev.filter(x => !(x.cartao === f.cartao && x.mes_ref === f.mes_ref))
          return [...filtered, f]
        })
      }
      setSyncError(false)
    } catch (e) {
      setSyncError(true); throw e
    } finally {
      setSyncing(false)
    }
  }

  async function saveOrcamento(mes: string, valor: number) {
    if (!user) return
    setSyncing(true)
    try {
      if (mes === 'default') {
        await supabase.from('config').upsert({ user_id: user.id, orcamento_default: valor, fechamento_sicredi: cfg.fechamento_sicredi, fechamento_nubank: cfg.fechamento_nubank })
      } else {
        await supabase.from('orcamentos_mes').upsert({ user_id: user.id, mes, valor })
      }
      setOrcs(prev => ({ ...prev, [mes]: valor }))
      setSyncError(false)
    } catch (e) {
      setSyncError(true); throw e
    } finally {
      setSyncing(false)
    }
  }

  async function saveConfig(newCfg: Partial<Config>) {
    if (!user) return
    setSyncing(true)
    const merged = { ...cfg, ...newCfg, user_id: user.id }
    try {
      await supabase.from('config').upsert(merged)
      setCfg(merged)
      setSyncError(false)
    } catch (e) {
      setSyncError(true); throw e
    } finally {
      setSyncing(false)
    }
  }

  // ── FIX: salvamento de categorias preserva tudo, usa upsert + delete específico ──
  async function saveCategorias(newCats: Categoria[]) {
    if (!user) return
    setSyncing(true)
    try {
      // Buscar IDs atuais no banco
      const { data: dbCats } = await supabase.from('categorias').select('id').eq('user_id', user.id)
      const dbIds = new Set((dbCats || []).map((c: any) => c.id))
      const newIds = new Set(newCats.map(c => c.id))

      // Apagar só os que foram removidos (estão no banco mas não na nova lista)
      const idsToDelete = [...dbIds].filter(id => !newIds.has(id))
      if (idsToDelete.length > 0) {
        await supabase.from('categorias').delete().eq('user_id', user.id).in('id', idsToDelete)
      }

      // Upsert dos novos/atualizados
      const toUpsert = newCats.map((c, i) => ({ ...c, user_id: user.id, ordem: i }))
      if (toUpsert.length > 0) {
        await supabase.from('categorias').upsert(toUpsert)
      }

      setCats(newCats)
      setSyncError(false)
    } catch (e) {
      console.error('saveCategorias error:', e)
      setSyncError(true)
      throw e
    } finally {
      setSyncing(false)
    }
  }

  async function savePrevisto(key: string, data: PrevStatus | null) {
    if (!user) return
    setSyncing(true)
    try {
      if (!data) {
        await supabase.from('previstos_status').delete().eq('user_id', user.id).eq('chave', key)
        setPrevistos(prev => { const next = { ...prev }; delete next[key]; return next })
      } else {
        await supabase.from('previstos_status').upsert({ ...data, user_id: user.id })
        setPrevistos(prev => ({ ...prev, [key]: data }))
      }
      setSyncError(false)
    } catch (e) {
      setSyncError(true); throw e
    } finally {
      setSyncing(false)
    }
  }

  // ── COMPUTED HELPERS ──

  function getFechamento(cartao: string) {
    return cartao.includes('Sicredi') ? cfg.fechamento_sicredi : cfg.fechamento_nubank
  }

  function mesFatura(data: string, cartao: string, offset: number): string {
    const fech = getFechamento(cartao)
    const d = parseInt(data.slice(8, 10))
    let base = data.slice(0, 7)
    if (d > fech) base = addMonth(base, 1)
    return addMonth(base, offset)
  }

  function gerarOcs(l: Lancamento) {
    const p = ['Sicredi Mastercard Black', 'Nubank Platinum'].includes(l.pagamento)
    const parc = l.parcelas || 1
    const vp = l.valor / parc
    return Array.from({ length: parc }, (_, i) => ({
      l, pn: i + 1, pt: parc,
      mes: p ? mesFatura(l.data, l.pagamento, i) : l.data.slice(0, 7),
      vp
    }))
  }

  function ocsNoMes(ym: string) {
    return lancamentos.flatMap(l => gerarOcs(l).filter(o => o.mes === ym))
  }

  function getOrc(ym: string) {
    return orcs[ym] !== undefined ? orcs[ym] : orcs['default'] !== undefined ? orcs['default'] : 0
  }

  function ocorrenciasMes(r: Recorrente, ym: string): number {
    if (r.freq === 'mensal') return 1
    if (r.freq === 'quinzenal') return 2
    if (r.freq === 'semanal') return 4
    if (r.freq === 'trimestral') {
      const ref = r.mes_ref || new Date().toISOString().slice(0, 7)
      const [yR, mR] = ref.split('-').map(Number)
      const [y, m] = ym.split('-').map(Number)
      const diff = (y - yR) * 12 + (m - mR)
      return diff >= 0 && diff % 3 === 0 ? 1 : 0
    }
    if (r.freq === 'anual') {
      const ref = r.mes_ref || new Date().toISOString().slice(0, 7)
      return ym.slice(5, 7) === ref.slice(5, 7) ? 1 : 0
    }
    return 0
  }

  function previstosDoMes(ym: string): PrevItem[] {
    return recorrentes.flatMap(r => {
      const n = ocorrenciasMes(r, ym)
      return Array.from({ length: n }, (_, i) => {
        const key = `${r.id}::${ym}::${i}`
        const p = previstos[key]
        return {
          rec: r, idx: i, total: n, key,
          valor: r.valor,
          status: (p?.status || 'pendente') as PrevItem['status'],
          lancamentoId: p?.lancamento_id
        }
      })
    })
  }

  function valMensalRec(r: Recorrente) {
    return r.valor * (FREQ_MES[r.freq] || 1)
  }

  function pendentesValor(ym: string) {
    return previstosDoMes(ym).filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0)
  }

  return {
    lancamentos, recorrentes, faturas, orcs, cfg, cats, previstos,
    loading, syncing, syncError,
    saveLancamento, saveRecorrente, saveFatura, saveOrcamento,
    saveConfig, saveCategorias, savePrevisto,
    ocsNoMes, getOrc, gerarOcs, previstosDoMes, valMensalRec,
    pendentesValor, mesFatura, getFechamento, ocorrenciasMes,
    reload: loadAll,
  }
}
