'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { fmt, fmtS, mlbl, mlblFull, addMonth, FREQ_LABEL, CLASSES, PAGAMENTOS, thisMonthLocal } from '@/lib/types'
import type { Recorrente } from '@/lib/types'
import MonthSelector from './MonthSelector'

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  curMonth: string
  months: string[]
  onChangeMonth: (m: string) => void
}

const FREQ_NAME: Record<string, string> = {
  mensal: 'Mensal', quinzenal: 'Quinzenal', semanal: 'Semanal', trimestral: 'Trimestral', anual: 'Anual'
}

export default function TabPlanejar({ user, fin, curMonth, months, onChangeMonth }: Props) {
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Recorrente | null>(null)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [freq, setFreq] = useState('mensal')
  const [cat, setCat] = useState<string | null>(null)
  const [classe, setClasse] = useState<string | null>(null)
  const [casaRio, setCasaRio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const planTotal = fin.recorrentes.reduce((s, r) => s + fin.valMensalRec(r), 0)
  const ocs = fin.ocsNoMes(curMonth)
  const realTotal = ocs.reduce((s, o) => s + o.vp, 0)

  // Timeline
  const timeMonths = Array.from({ length: 6 }, (_, i) => addMonth(curMonth, i - 1))
  const dadosT = timeMonths.map(m => {
    const lanc = fin.ocsNoMes(m).reduce((s, o) => s + o.vp, 0)
    return { m, lanc, rec: planTotal, total: lanc + planTotal }
  })
  const maxT = Math.max(...dadosT.map(d => d.total), 1)

  // Recorrentes ordenados
  const ordemClasse: Record<string, number> = { dispensavel: 0, reduzivel: 1, necessario: 2 }
  const recOrdered = [...fin.recorrentes].sort((a, b) =>
    (ordemClasse[a.classe] ?? 99) - (ordemClasse[b.classe] ?? 99) || b.valor - a.valor
  )

  // Compare
  const mapa: Record<string, { plan: number; real: number }> = {}
  fin.recorrentes.forEach(r => {
    if (!mapa[r.categoria]) mapa[r.categoria] = { plan: 0, real: 0 }
    mapa[r.categoria].plan += fin.valMensalRec(r)
  })
  ocs.forEach(o => {
    if (!mapa[o.l.categoria]) mapa[o.l.categoria] = { plan: 0, real: 0 }
    mapa[o.l.categoria].real += o.vp
  })
  const compareList = Object.entries(mapa).sort((a, b) =>
    (b[1].real + b[1].plan) - (a[1].real + a[1].plan)
  )

  function openModal(r?: Recorrente) {
    if (r) {
      setEdit(r); setNome(r.nome); setValor(r.valor.toFixed(2).replace('.', ','))
      setFreq(r.freq); setCat(r.categoria); setClasse(r.classe); setCasaRio(!!r.casa_rio)
    } else {
      setEdit(null); setNome(''); setValor(''); setFreq('mensal')
      setCat(null); setClasse(null); setCasaRio(false)
    }
    setErr(''); setModal(true)
  }

  function maskValor(v: string) {
    const digits = v.replace(/\D/g, '')
    if (!digits || digits === '0' || digits === '00') { setValor(''); return }
    setValor((parseInt(digits) / 100).toFixed(2).replace('.', ','))
  }

  async function salvar() {
    const v = parseFloat(valor.replace(',', '.').replace(/\.(?=.*\d{3},)/g, '')) || 0
    if (!nome) { setErr('Informe o nome'); return }
    if (!v || v <= 0) { setErr('Informe o valor'); return }
    if (!cat) { setErr('Escolha uma categoria'); return }
    if (!classe) { setErr('Escolha a classificação'); return }
    setErr(''); setSaving(true)
    try {
      const r: Recorrente = {
        id: edit?.id || crypto.randomUUID(),
        user_id: user.id, nome, valor: v, freq: freq as any,
        categoria: cat, classe: classe as any, casa_rio: casaRio,
        mes_ref: edit?.mes_ref || thisMonthLocal()
      }
      await fin.saveRecorrente(r)
      setModal(false)
    } catch (e) { setErr('Erro ao salvar') } finally { setSaving(false) }
  }

  async function excluir() {
    if (!edit) return
    if (!confirm('Excluir este gasto recorrente?')) return
    setSaving(true)
    try { await fin.saveRecorrente(edit, true); setModal(false) } finally { setSaving(false) }
  }

  function goToMonth(m: string) { onChangeMonth(m) }

  return (
    <div className="page-enter">
      <div className="flex justify-between items-center px-4 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-bold">Planejar <span className="text-primary">gastos</span></h1>
        <div className="flex gap-2 items-center">
          <MonthSelector value={curMonth} months={months} onChange={onChangeMonth} />
          <button onClick={() => openModal()} className="bg-white border border-slate-200 text-slate-600 w-9 h-9 rounded-lg flex items-center justify-center">＋</button>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">
        {/* Summary */}
        {fin.recorrentes.length === 0 ? (
          <div className="bg-sky-50 border border-primary/30 rounded-2xl p-4">
            <div className="text-xs uppercase tracking-widest text-primary-dark font-bold mb-1">Comece pelo planejamento</div>
            <div className="text-sm text-primary-dark">Cadastre gastos recorrentes tocando em ＋ no topo</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Planejado/mês</div>
              <div className="text-lg font-bold">{fmtS(planTotal)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{fin.recorrentes.length} recorrente{fin.recorrentes.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Realizado · {mlbl(curMonth)}</div>
              <div className="text-lg font-bold">{fmtS(realTotal)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{ocs.length} lançamento{ocs.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-4 mb-1">Próximos 6 meses</h2>
          <p className="text-[11px] text-slate-400 mb-2.5">Parcelas comprometidas + recorrentes</p>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {dadosT.map(d => {
              const pct = Math.min(100, (d.total / maxT) * 100)
              const isCur = d.m === curMonth
              return (
                <button key={d.m} onClick={() => goToMonth(d.m)}
                  className={`flex-shrink-0 w-[88px] rounded-xl p-2.5 text-center transition-all ${isCur ? 'bg-sky-50 border-2 border-primary' : 'bg-white border border-slate-200'}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isCur ? 'text-primary-dark' : 'text-slate-500'}`}>{mlbl(d.m)}</div>
                  <div className="h-9 flex flex-col justify-end my-1">
                    <div className={`rounded-t ${isCur ? 'bg-primary-dark' : 'bg-primary'}`} style={{ height: `${pct}%`, minHeight: 2 }} />
                  </div>
                  <div className="text-xs font-bold">{fmtS(d.total)}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recorrentes */}
        <div>
          <div className="flex justify-between items-center mt-4 mb-2.5">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Gastos recorrentes</h2>
            <span className="text-[11px] text-slate-400 font-bold">{fin.recorrentes.length}</span>
          </div>
          {fin.recorrentes.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-9 leading-relaxed">Nenhum gasto recorrente.<br /><span className="text-slate-500 font-semibold">Toque em ＋ para adicionar.</span></div>
          ) : recOrdered.map(r => {
            const mensal = fin.valMensalRec(r)
            const c = fin.cats.find(x => x.nome === r.categoria)
            const badgeStyles = r.classe === 'necessario' ? 'bg-emerald-50 text-emerald-800'
              : r.classe === 'reduzivel' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
            const badgeLabel = r.classe === 'necessario' ? '✓ Necessário'
              : r.classe === 'reduzivel' ? '⚡ Reduzível' : '✗ Dispensável'
            return (
              <button key={r.id} onClick={() => openModal(r)} className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 mb-2 text-left active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-2 gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold flex items-center gap-1.5">
                      {r.nome}
                      {r.casa_rio && <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">Casa do Rio</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c?.cor || '#94A3B8' }} />
                      {r.categoria} · {FREQ_NAME[r.freq]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold">{fmt(mensal)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">/mês</div>
                  </div>
                </div>
                {r.freq !== 'mensal' && (
                  <div className="text-[11px] text-slate-400 -mt-1 mb-2">{fmt(r.valor)} por vez · {FREQ_LABEL[r.freq]}</div>
                )}
                <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${badgeStyles}`}>{badgeLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Compare */}
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mt-4 mb-1">Realizado × planejado</h2>
          <p className="text-[11px] text-slate-400 mb-2.5">{mlblFull(curMonth)}</p>
          {compareList.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-6">Sem dados para comparar.</div>
          ) : compareList.map(([n, d]) => {
            const c = fin.cats.find(x => x.nome === n)
            const pct = d.plan > 0 ? Math.min(100, (d.real / d.plan) * 100) : 0
            const diff = d.real - d.plan
            let statusEl, barColor = c?.cor || '#94A3B8'
            if (d.plan === 0) statusEl = <span className="text-[11px] text-slate-400">sem planejado</span>
            else if (d.real === 0) statusEl = <span className="text-[11px] font-bold text-emerald-600">não gastou ainda</span>
            else if (pct >= 100) { barColor = '#EF4444'; statusEl = <span className="text-[11px] font-bold text-red-600">+{fmt(Math.abs(diff))} acima</span> }
            else if (pct >= 80) { barColor = '#F59E0B'; statusEl = <span className="text-[11px] font-bold text-amber-600">faltam {fmt(Math.abs(diff))}</span> }
            else statusEl = <span className="text-[11px] font-bold text-emerald-600">faltam {fmt(Math.abs(diff))}</span>

            return (
              <div key={n} className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-2">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: c?.cor || '#94A3B8' }} />
                  <div className="flex-1 text-sm font-bold">{n}</div>
                  {statusEl}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Realizado</div>
                    <div className={`text-base font-bold ${pct >= 100 ? 'text-red-500' : ''}`}>{fmt(d.real)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Planejado</div>
                    <div className="text-base font-bold text-slate-500">{d.plan > 0 ? fmt(d.plan) : '—'}</div>
                  </div>
                </div>
                {d.plan > 0 && (
                  <>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                      <span>{pct.toFixed(0)}% utilizado</span>
                      <span>de {fmt(d.plan)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-1">{edit ? 'Editar recorrente' : 'Novo gasto recorrente'}</h2>
            <p className="text-sm text-slate-500 mb-4">Classifique como necessário, reduzível ou dispensável.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Nome</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Cabelo, Psicóloga, Academia" className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Valor</label>
                  <input type="text" inputMode="decimal" value={valor} onChange={e => maskValor(e.target.value)}
                    placeholder="0,00" className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-3 py-3 text-base font-bold text-center" />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Frequência</label>
                  <select value={freq} onChange={e => setFreq(e.target.value)}
                    className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-3 py-3 text-sm font-medium bg-white">
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="semanal">Semanal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  {fin.cats.map(c => (
                    <button key={c.id} onClick={() => setCat(c.nome)}
                      className={`px-3 py-2 rounded-full border text-sm font-semibold ${cat === c.nome ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {c.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Classificação</label>
                <div className="flex flex-wrap gap-2">
                  {CLASSES.map(x => (
                    <button key={x.k} onClick={() => setClasse(x.k)}
                      className={`px-3 py-2 rounded-full border text-sm font-semibold ${classe === x.k ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setCasaRio(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${casaRio ? 'bg-purple-50 border-purple-400' : 'bg-white border-slate-200'}`}>
                <div className="text-left">
                  <div className="text-sm font-semibold">🏡 Casa do Rio</div>
                  <div className="text-xs text-slate-400">Gasto destinado à barragem</div>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${casaRio ? 'bg-purple-500' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${casaRio ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}

              <button onClick={salvar} disabled={saving} className="w-full bg-primary disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-sm">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              {edit && (
                <button onClick={excluir} disabled={saving} className="w-full border border-slate-200 text-red-500 py-3 rounded-xl font-semibold text-sm">Excluir</button>
              )}
              <button onClick={() => setModal(false)} className="w-full text-slate-400 py-3 text-sm font-semibold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
