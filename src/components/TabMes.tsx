'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { CARTOES, fmt, fmtS, mlbl, mlblFull } from '@/lib/types'
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

// Mapeamento de categoria para ícone
const CAT_ICON: Record<string, string> = {
  'Mercado': '🛒', 'Restaurante': '🍴', 'Combustível': '⛽',
  'Saúde': '💊', 'Lazer': '🎮', 'Viagens': '✈️',
  'Assinaturas': '📺', 'Casa': '🏠', 'Outros': '📦',
  'Academia': '💪', 'Delivery/Restaurante': '🍴',
}

function iconFor(cat: string) {
  return CAT_ICON[cat] || '💳'
}

// Último dia do mês
function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 0)
  return String(d.getDate()).padStart(2, '0') + '/' + String(m).padStart(2, '0')
}

export default function TabMes({ user, fin, curMonth, months, onChangeMonth, onOpenConfig, onOpenBudget, onEditLanc, onGoFaturas, onConfirmPrev }: Props) {
  const [showAllPrev, setShowAllPrev] = useState(false)
  const [showAllCats, setShowAllCats] = useState(false)
  const [showAllLancs, setShowAllLancs] = useState(false)
  const [showPrevModal, setShowPrevModal] = useState(false)

  const ocs = fin.ocsNoMes(curMonth)
  const totalGasto = ocs.reduce((s, o) => s + o.vp, 0)
  const orc = fin.getOrc(curMonth)
  const pend = fin.pendentesValor(curMonth)
  const projecao = totalGasto + pend
  const rest = orc - totalGasto
  const restPos = orc - projecao
  const prr = orc > 0 ? (totalGasto / orc) * 100 : 0
  const prProj = orc > 0 ? (projecao / orc) * 100 : 0
  const pctProj = orc > 0 ? Math.round(prProj) : 0

  // Categorias do mês
  const totsByCat: Record<string, number> = {}
  ocs.forEach(o => { totsByCat[o.l.categoria] = (totsByCat[o.l.categoria] || 0) + o.vp })
  const catEntries = Object.entries(totsByCat).sort((a, b) => b[1] - a[1])
  const visibleCats = showAllCats ? catEntries : catEntries.slice(0, 3)

  // Previstos
  const prevList = fin.previstosDoMes(curMonth)
  const prevPend = prevList.filter(p => p.status === 'pendente')
  const prevConf = prevList.filter(p => p.status === 'confirmado')
  const prevSkip = prevList.filter(p => p.status === 'pulado')

  let visiblePrev = [...prevPend]
  if (showAllPrev) visiblePrev = visiblePrev.concat(prevConf, prevSkip)

  // Lançamentos ordenados (mostra 5, depois "ver todos")
  const sortedLancs = [...ocs].sort((a, b) => b.l.data.localeCompare(a.l.data))
  const visibleLancs = showAllLancs ? sortedLancs : sortedLancs.slice(0, 5)

  // Estilo do card hero
  let heroGradient = 'linear-gradient(135deg, #1FBED6 0%, #0E7490 100%)'
  if (orc > 0 && prr >= 100) heroGradient = 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)'
  else if (orc > 0 && prr >= 80) heroGradient = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'

  async function handleConfirmPrev(key: string) { onConfirmPrev(key) }

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
    <div className="page-enter pb-4">
      {/* Header limpo */}
      <div className="flex justify-between items-center px-4 pt-5 pb-3 max-w-lg mx-auto">
        <div>
          <div className="text-xs text-slate-500 font-medium">
            Olá{user.email ? ', ' + user.email.split('@')[0] : ''}
          </div>
          <div className="text-lg font-medium text-slate-900 -tracking-tight">{mlblFull(curMonth)}</div>
        </div>
        <div className="flex gap-1.5">
          <div className="relative">
            <MonthSelector value={curMonth} months={months} onChange={onChangeMonth} />
          </div>
          <button onClick={onOpenConfig} className="bg-white border border-slate-200 text-slate-500 w-9 h-9 rounded-lg flex items-center justify-center text-sm">⚙</button>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">

        {/* HERO: Saldo disponível */}
        {orc === 0 ? (
          <button onClick={onOpenBudget} className="w-full bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
            <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Orçamento mensal</div>
            <div className="text-primary font-bold">Toque para definir →</div>
          </button>
        ) : (
          <div className="rounded-2xl p-5 text-white" style={{ background: heroGradient }}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-[11px] uppercase tracking-widest font-bold opacity-85">
                {rest >= 0 ? 'Saldo disponível' : 'Excedeu o orçamento'}
              </div>
              <button onClick={onOpenBudget} className="bg-white/20 w-7 h-7 rounded-lg text-xs">✎</button>
            </div>
            <div className="text-4xl font-medium leading-none tracking-tight mb-1">
              {fmt(Math.abs(rest))}
            </div>
            <div className="text-xs opacity-90 mb-1">
              de {fmt(orc)} · até {lastDayOfMonth(curMonth)}
            </div>

            {/* Saldo após previstos (linha discreta) */}
            {pend > 0 && (
              <div className="text-[11px] opacity-75 mb-3">
                após previstos: <span className="font-medium">{restPos >= 0 ? fmt(restPos) : '−' + fmt(Math.abs(restPos))}</span>
              </div>
            )}
            {pend === 0 && <div className="mb-3" />}

            {/* Barra dupla: gasto sólido + projeção translúcida */}
            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden relative mb-3">
              {pend > 0 && <div className="h-full bg-white/50 absolute top-0 left-0 transition-all" style={{ width: `${Math.min(100, prProj)}%` }} />}
              <div className="h-full bg-white absolute top-0 left-0 transition-all" style={{ width: `${Math.min(100, prr)}%` }} />
            </div>

            <div className="flex justify-between text-[11px] opacity-90 font-medium">
              <span>Gasto · {fmt(totalGasto)}</span>
              {pend > 0 && <span>Previsto · +{fmt(pend)}</span>}
            </div>
          </div>
        )}

        {/* Stats: Previstos + Projeção lado a lado */}
        {orc > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => prevList.length > 0 && setShowPrevModal(true)}
              disabled={prevList.length === 0}
              className="bg-white rounded-2xl p-3.5 text-left disabled:opacity-60">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">⏱</div>
                <span className="text-[11px] text-slate-500 font-medium">Previstos</span>
              </div>
              <div className="text-lg font-medium text-slate-900 tracking-tight">{fmtS(pend)}</div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: prevPend.length > 0 ? '#92400E' : '#94A3B8' }}>
                {prevPend.length > 0 ? `${prevPend.length} pendente${prevPend.length === 1 ? '' : 's'}` : 'tudo em dia'}
              </div>
            </button>

            <div className="bg-white rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">📈</div>
                <span className="text-[11px] text-slate-500 font-medium">Projeção</span>
              </div>
              <div className="text-lg font-medium text-slate-900 tracking-tight">{fmtS(projecao)}</div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: pctProj >= 100 ? '#B91C1C' : pctProj >= 80 ? '#92400E' : '#065F46' }}>
                {pctProj}% do total
              </div>
            </div>
          </div>
        )}

        {/* Faturas mini */}
        <div className="grid grid-cols-2 gap-2">
          {CARTOES.map(c => {
            const isSc = c.includes('Sicredi')
            const total = ocs.filter(o => o.l.pagamento === c).reduce((s, o) => s + o.vp, 0)
            const paga = fin.faturas.find(f => f.cartao === c && f.mes_ref === curMonth)
            const fech = fin.getFechamento(c)
            return (
              <button key={c} onClick={onGoFaturas} className="bg-white rounded-2xl p-3.5 relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: isSc ? '#00833E' : '#8A05BE' }} />
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-1 mb-1">{isSc ? 'Sicredi' : 'Nubank'}</div>
                <div className={`text-base font-medium tracking-tight ${paga ? 'text-emerald-500' : 'text-slate-900'}`}>{fmtS(total)}</div>
                <div className="text-[10px] text-slate-400 font-medium">{paga ? '✓ paga' : `fecha dia ${fech}`}</div>
              </button>
            )
          })}
        </div>

        {/* Onde está indo (top categorias) */}
        {ocs.length > 0 && (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="text-xs text-slate-600 font-medium uppercase tracking-wider">Onde está indo</div>
              <span className="text-[11px] text-slate-400">{catEntries.length} categoria{catEntries.length === 1 ? '' : 's'}</span>
            </div>

            <div className="bg-white rounded-2xl p-4">
              {visibleCats.map(([n, v], idx) => {
                const cat = fin.cats.find(c => c.nome === n)
                const pct = (v / totalGasto) * 100
                return (
                  <div key={n} className={idx > 0 ? 'mt-3' : ''}>
                    <div className="flex items-center mb-1.5">
                      <div className="w-2 h-2 rounded-full mr-2.5" style={{ background: cat?.cor || '#94A3B8' }} />
                      <div className="flex-1 text-sm font-medium text-slate-900">{n}</div>
                      <div className="text-sm font-medium text-slate-900">{fmt(v)}</div>
                      <div className="text-[11px] text-slate-400 ml-1.5">{pct.toFixed(0)}%</div>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat?.cor || '#94A3B8' }} />
                    </div>
                  </div>
                )
              })}
              {catEntries.length > 3 && (
                <button onClick={() => setShowAllCats(v => !v)} className="w-full text-primary text-xs font-medium pt-3 mt-3 border-t border-slate-100">
                  {showAllCats ? 'Mostrar menos' : `Ver mais ${catEntries.length - 3}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Últimos lançamentos */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2 px-1">
            <div className="text-xs text-slate-600 font-medium uppercase tracking-wider">Últimos lançamentos</div>
            <span className="text-[11px] text-slate-400">{ocs.length}</span>
          </div>

          {ocs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-9 leading-relaxed">
              Nada por aqui ainda.<br />
              <span className="text-slate-500 font-medium">Toque em ＋ para lançar.</span>
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-4">
              {visibleLancs.map((o, idx) => {
                const l = o.l
                const cat = fin.cats.find(c => c.nome === l.categoria)
                const today = new Date().toISOString().slice(0, 10)
                const isToday = l.data === today
                const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10) })()
                const isYday = l.data === yesterday
                const dataLabel = isToday ? 'hoje' : isYday ? 'ontem' : l.data.slice(8, 10) + '/' + ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(l.data.slice(5, 7))-1]
                const payShort = l.pagamento.split(' ')[0]

                return (
                  <button key={`${l.id}-${o.pn}`} onClick={() => onEditLanc(l)}
                    className={`w-full flex items-center py-3 text-left ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base mr-3 flex-shrink-0" style={{ background: (cat?.cor || '#94A3B8') + '20', color: cat?.cor || '#94A3B8' }}>
                      {iconFor(l.categoria)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                        {l.descricao || l.categoria}
                        {l.casa_rio && <span className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">CR</span>}
                        {o.pt > 1 && <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">{o.pn}/{o.pt}</span>}
                        {l.rec_id && <span className="text-primary text-xs">⚡</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{dataLabel} · {payShort}</div>
                    </div>
                    <div className="text-sm font-medium text-slate-900 ml-2">{fmt(o.vp)}</div>
                  </button>
                )
              })}
              {sortedLancs.length > 5 && (
                <button onClick={() => setShowAllLancs(v => !v)} className="w-full text-primary text-xs font-medium py-3 border-t border-slate-100">
                  {showAllLancs ? 'Mostrar menos' : `Ver todos os ${sortedLancs.length}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Previstos */}
      {showPrevModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowPrevModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
            <div className="flex justify-between items-baseline mb-1">
              <h2 className="text-lg font-bold">⏱ Previstos · {mlbl(curMonth)}</h2>
              <span className="text-xs text-slate-400 font-medium">
                {prevPend.length > 0 ? `${prevPend.length} pendente${prevPend.length === 1 ? '' : 's'}` : 'tudo em dia'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">Confirme, pule, ou edite os previstos do mês.</p>

            {prevPend.length === 0 && prevConf.length === 0 && prevSkip.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Sem previstos neste mês.</div>
            ) : (
              <>
                {visiblePrev.map(p => {
                  const cat = fin.cats.find(c => c.nome === p.rec.categoria)
                  const ix = p.total > 1 ? <span className="text-[10px] text-slate-400 font-normal ml-1">{p.idx + 1}/{p.total}</span> : null
                  if (p.status === 'confirmado') return (
                    <div key={p.key} className="flex items-center gap-2 py-2.5 border-t border-slate-100 first:border-t-0 opacity-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat?.cor || '#94A3B8' }} />
                          {p.rec.categoria}
                        </div>
                      </div>
                      <div className="text-sm font-bold">{fmt(p.valor)}</div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-800">✓ ok</span>
                      <button onClick={() => handleUndoPrev(p.key)} className="text-[11px] text-slate-400 font-semibold px-1">desfazer</button>
                    </div>
                  )
                  if (p.status === 'pulado') return (
                    <div key={p.key} className="flex items-center gap-2 py-2.5 border-t border-slate-100 first:border-t-0 opacity-40">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500">pulado</span>
                      <button onClick={() => handleUndoPrev(p.key)} className="text-[11px] text-slate-400 font-semibold px-1">desfazer</button>
                    </div>
                  )
                  return (
                    <div key={p.key} className="flex items-center gap-2 py-3 border-t border-slate-100 first:border-t-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p.rec.nome}{ix}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat?.cor || '#94A3B8' }} />
                          {p.rec.categoria} · {fmt(p.valor)}
                        </div>
                      </div>
                      <button onClick={() => { handleConfirmPrev(p.key); setShowPrevModal(false) }} className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg">Confirmar</button>
                      <button onClick={() => handleSkipPrev(p.key)} className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg">Pular</button>
                    </div>
                  )
                })}
                {(prevConf.length + prevSkip.length) > 0 && (
                  <button onClick={() => setShowAllPrev(v => !v)} className="w-full text-primary text-xs font-bold pt-3 mt-2 border-t border-slate-100">
                    {showAllPrev ? 'Ocultar concluídos' : `Ver ${prevConf.length + prevSkip.length} concluído${prevConf.length + prevSkip.length === 1 ? '' : 's'}`}
                  </button>
                )}
              </>
            )}

            <button onClick={() => setShowPrevModal(false)} className="w-full text-slate-400 py-3 text-sm font-semibold mt-3">Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
