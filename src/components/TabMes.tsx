'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { CARTOES, fmt, fmtS, mlbl } from '@/lib/types'
import type { Lancamento } from '@/lib/types'
import MonthSelector from './MonthSelector'

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  curMonth: string
  months: string[]
  onChangeMonth: (m: string) => void
  onOpenConfig: () => void
  onOpenBudget: () => void
  onEditLanc: (l: Lancamento) => void
  onGoFaturas: () => void
  onConfirmPrev: (key: string) => void
}

export default function TabMes({ user, fin, curMonth, months, onChangeMonth, onOpenConfig, onOpenBudget, onEditLanc, onGoFaturas, onConfirmPrev }: Props) {
  const [showAllPrev, setShowAllPrev] = useState(false)

  const ocs = fin.ocsNoMes(curMonth)
  const totalGasto = ocs.reduce((s, o) => s + o.vp, 0)
  const orc = fin.getOrc(curMonth)
  const pend = fin.pendentesValor(curMonth)
  const projecao = totalGasto + pend
  const rest = orc - totalGasto
  const prr = orc > 0 ? (totalGasto / orc) * 100 : 0
  const prProj = orc > 0 ? (projecao / orc) * 100 : 0

  // Categorias do mês
  const totsByCat: Record<string, number> = {}
  ocs.forEach(o => { totsByCat[o.l.categoria] = (totsByCat[o.l.categoria] || 0) + o.vp })

  // Casa do Rio
  const cr = ocs.filter(o => o.l.casa_rio)
  const totCr = cr.reduce((s, o) => s + o.vp, 0)

  // Previstos
  const prevList = fin.previstosDoMes(curMonth)
  const prevPend = prevList.filter(p => p.status === 'pendente')
  const prevConf = prevList.filter(p => p.status === 'confirmado')
  const prevSkip = prevList.filter(p => p.status === 'pulado')

  let visiblePrev = [...prevPend]
  if (showAllPrev) visiblePrev = visiblePrev.concat(prevConf, prevSkip)

  let budgetCls = 'bg-gradient-to-br from-primary to-primary-dark'
  let alert = ''
  if (orc > 0) {
    if (prr >= 100) { budgetCls = 'bg-gradient-to-br from-red-500 to-red-700'; alert = `⚠️ Orçamento estourado em ${fmt(totalGasto - orc)}` }
    else if (prr >= 80) { budgetCls = 'bg-gradient-to-br from-red-500 to-red-700'; alert = `🚨 Restam apenas ${(100 - prr).toFixed(0)}%` }
    else if (prr >= 70) { budgetCls = 'bg-gradient-to-br from-amber-500 to-orange-600'; alert = `⚡ Atenção: passou de 70%` }
    else if (prProj >= 100 && pend > 0) alert = `📊 Projeção excede em ${fmt(projecao - orc)}`
    else if (prProj >= 80 && pend > 0) alert = `📊 Projeção: ${prProj.toFixed(0)}% do orçamento`
  }

  async function handleConfirmPrev(key: string) {
    onConfirmPrev(key)
  }

  async function handleSkipPrev(key: string) {
    if (!confirm('Pular este previsto neste mês?')) return
    await fin.savePrevisto(key, { user_id: user.id, chave: key, status: 'pulado', lancamento_id: null })
  }

  async function handleUndoPrev(key: string) {
    const p = fin.previstos[key]
    if (p && p.status === 'confirmado' && p.lancamento_id) {
      if (confirm('Esse previsto gerou um lançamento. Excluir o lançamento também?')) {
        const l = fin.lancamentos.find(x => x.id === p.lancamento_id)
        if (l) await fin.saveLancamento(l, true)
      }
    }
    await fin.savePrevisto(key, null)
  }

  return (
    <div className="page-enter">
      <div className="flex justify-between items-center px-4 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-bold">Este <span className="text-primary">mês</span></h1>
        <div className="flex gap-2 items-center">
          <MonthSelector value={curMonth} months={months} onChange={onChangeMonth} />
          <button onClick={onOpenConfig} className="bg-white border border-slate-200 text-slate-500 w-9 h-9 rounded-lg flex items-center justify-center">⚙</button>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">
        {/* Orçamento */}
        {orc === 0 ? (
          <button onClick={onOpenBudget} className="w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center">
            <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-1">Orçamento mensal</div>
            <div className="text-primary font-bold">Toque para definir seu orçamento →</div>
          </button>
        ) : (
          <div className={`${budgetCls} rounded-2xl p-5 text-white`}>
            <div className="flex justify-between items-start mb-3">
              <div className="text-[11px] uppercase tracking-widest font-bold opacity-90">Orçamento · {mlbl(curMonth)}</div>
              <button onClick={onOpenBudget} className="bg-white/20 w-7 h-7 rounded-lg text-xs">✎</button>
            </div>
            <div className="flex justify-between items-end mb-3">
              <div>
                <div className="text-2xl font-bold leading-none">{fmt(totalGasto)}</div>
                <div className="text-xs opacity-90 mt-1 font-medium">de {fmt(orc)} · {prr.toFixed(0)}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider opacity-90 font-bold">{rest >= 0 ? 'Restante' : 'Excedeu'}</div>
                <div className="text-lg font-bold">{fmt(Math.abs(rest))}</div>
              </div>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden mb-2 relative">
              {pend > 0 && <div className="h-full bg-white/40 absolute top-0 left-0 transition-all" style={{ width: `${Math.min(100, prProj)}%` }} />}
              <div className="h-full bg-white absolute top-0 left-0 transition-all" style={{ width: `${Math.min(100, prr)}%` }} />
            </div>
            {pend > 0 && (
              <div className="flex justify-between text-xs opacity-90 font-semibold mb-1">
                <span>+ {fmt(pend)} previsto</span>
                <span>projeção {fmt(projecao)}</span>
              </div>
            )}
            {alert && <div className="text-xs font-semibold text-center bg-white/20 rounded-lg py-2 mt-2">{alert}</div>}
          </div>
        )}

        {/* Previstos */}
        {prevList.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between items-baseline mb-1">
              <div className="font-bold text-sm">⚡ Previstos · {mlbl(curMonth)}</div>
              <div className="text-[11px] text-slate-400 font-semibold">
                {prevPend.length > 0 ? `${prevPend.length} pendente${prevPend.length > 1 ? 's' : ''} · ${fmt(prevPend.reduce((s, p) => s + p.valor, 0))}` : 'Tudo confirmado ✓'}
              </div>
            </div>
            {prevPend.length === 0 && !showAllPrev ? (
              <div className="text-center py-3 text-slate-400 text-xs">Tudo em dia neste mês 🎉</div>
            ) : visiblePrev.map(p => {
              const cat = fin.cats.find(c => c.nome === p.rec.categoria)
              const ix = p.total > 1 ? <span className="text-[10px] text-slate-400 font-normal ml-1">{p.idx + 1}/{p.total}</span> : null
              if (p.status === 'confirmado') return (
                <div key={p.key} className="flex items-center gap-3 py-2 border-t border-slate-100 first:border-t-0 opacity-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat?.cor || '#94A3B8' }} />
                      {p.rec.categoria}
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmt(p.valor)}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">✓ ok</span>
                  <button onClick={() => handleUndoPrev(p.key)} className="text-[11px] text-slate-400 font-semibold">desfazer</button>
                </div>
              )
              if (p.status === 'pulado') return (
                <div key={p.key} className="flex items-center gap-3 py-2 border-t border-slate-100 first:border-t-0 opacity-40">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">pulado</span>
                  <button onClick={() => handleUndoPrev(p.key)} className="text-[11px] text-slate-400 font-semibold">desfazer</button>
                </div>
              )
              return (
                <div key={p.key} className="flex items-center gap-2 py-2 border-t border-slate-100 first:border-t-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat?.cor || '#94A3B8' }} />
                      {p.rec.categoria}
                    </div>
                  </div>
                  <div className="text-sm font-bold whitespace-nowrap">{fmt(p.valor)}</div>
                  <button onClick={() => handleConfirmPrev(p.key)} className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Confirmar</button>
                  <button onClick={() => handleSkipPrev(p.key)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">Pular</button>
                </div>
              )
            })}
            {(prevConf.length + prevSkip.length) > 0 && (
              <button onClick={() => setShowAllPrev(v => !v)} className="w-full text-primary text-xs font-bold pt-3 mt-2 border-t border-slate-100">
                {showAllPrev ? 'Ocultar concluídos' : `Ver ${prevConf.length + prevSkip.length} concluído${prevConf.length + prevSkip.length > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}

        {/* Faturas mini */}
        <div className="grid grid-cols-2 gap-2.5">
          {CARTOES.map(c => {
            const cls = c.includes('Sicredi') ? 'sc' : 'nb'
            const total = ocs.filter(o => o.l.pagamento === c).reduce((s, o) => s + o.vp, 0)
            const paga = fin.faturas.find(f => f.cartao === c && f.mes_ref === curMonth)
            const fech = fin.getFechamento(c)
            return (
              <button key={c} onClick={onGoFaturas} className="bg-white border border-slate-200 rounded-2xl p-3.5 relative overflow-hidden text-left">
                <div className={`absolute top-0 left-0 right-0 h-1 ${cls === 'sc' ? 'bg-emerald-700' : 'bg-purple-700'}`} />
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold pt-1 mb-1">{cls === 'sc' ? 'Sicredi' : 'Nubank'}</div>
                <div className={`text-lg font-bold ${paga ? 'text-emerald-500' : ''}`}>{fmtS(total)}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5">{paga ? '✓ paga' : `fecha dia ${fech}`}</div>
              </button>
            )
          })}
        </div>

        {/* Casa do Rio */}
        {cr.length > 0 && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl p-4 flex justify-between items-center">
            <div>
              <div className="text-xs font-semibold opacity-90">🏡 Casa do Rio neste mês</div>
              <div className="text-[11px] opacity-80 mt-0.5">{cr.length} item{cr.length === 1 ? '' : 's'}</div>
            </div>
            <div className="text-xl font-bold">{fmt(totCr)}</div>
          </div>
        )}

        {/* Categorias do mês */}
        <div className="pt-3">
          <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2.5">Categorias do mês</h2>
          {ocs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">Sem lançamentos neste mês.</div>
          ) : Object.entries(totsByCat).sort((a, b) => b[1] - a[1]).map(([n, v]) => {
            const cat = fin.cats.find(c => c.nome === n)
            const pct = (v / totalGasto) * 100
            return (
              <div key={n} className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-2">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0" style={{ background: cat?.cor || '#94A3B8' }} />
                  <div className="flex-1 text-sm font-semibold">{n}</div>
                  <div className="text-sm font-bold">{fmt(v)} <span className="text-slate-400 font-medium">· {pct.toFixed(0)}%</span></div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat?.cor || '#94A3B8' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Lançamentos */}
        <div className="pt-3">
          <div className="flex justify-between items-center mb-2.5">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Lançamentos</h2>
            <span className="text-[11px] text-slate-400 font-bold">{ocs.length}</span>
          </div>
          {ocs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-9 leading-relaxed">Nada por aqui ainda.<br /><span className="text-slate-500 font-semibold">Toque em ＋ para lançar.</span></div>
          ) : [...ocs].sort((a, b) => b.l.data.localeCompare(a.l.data)).map(o => {
            const l = o.l
            const cat = fin.cats.find(c => c.nome === l.categoria)
            const dia = l.data.slice(8, 10) + '/' + l.data.slice(5, 7)
            return (
              <button key={`${l.id}-${o.pn}`} onClick={() => onEditLanc(l)}
                className={`w-full bg-white border border-slate-200 rounded-2xl p-3.5 mb-2 flex justify-between items-center text-left ${l.casa_rio ? 'border-l-[3px] border-l-purple-500' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider mb-1 font-bold flex items-center gap-1.5 flex-wrap" style={{ color: cat?.cor || '#94A3B8' }}>
                    {l.rec_id && <span className="text-primary mr-0.5">⚡</span>}
                    {l.categoria}
                    {l.casa_rio && <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-[9px]">Casa do Rio</span>}
                    {o.pt > 1 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded text-[9px]">{o.pn}/{o.pt}</span>}
                  </div>
                  <div className="text-[15px] font-semibold truncate">{l.descricao || '(sem descrição)'}</div>
                  <div className="text-xs text-slate-400 mt-0.5 font-medium">{dia} · {l.pagamento.split(' ')[0]}</div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-base font-bold">{fmt(o.vp)}</div>
                  {o.pt > 1 && <div className="text-[10px] text-slate-400 mt-0.5">total {fmt(l.valor)}</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
