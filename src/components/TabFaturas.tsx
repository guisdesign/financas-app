'use client'

import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { CARTOES, fmt } from '@/lib/types'
import MonthSelector from './MonthSelector'

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  curMonth: string
  months: string[]
  onChangeMonth: (m: string) => void
}

export default function TabFaturas({ user, fin, curMonth, months, onChangeMonth }: Props) {
  const ocs = fin.ocsNoMes(curMonth)

  async function togPagar(cartao: string) {
    const existing = fin.faturas.find(f => f.cartao === cartao && f.mes_ref === curMonth)
    if (existing) {
      await fin.saveFatura(existing, true)
    } else {
      const total = ocs.filter(o => o.l.pagamento === cartao).reduce((s, o) => s + o.vp, 0)
      await fin.saveFatura({
        user_id: user.id, cartao, mes_ref: curMonth,
        valor: total, data_pagamento: new Date().toISOString().slice(0, 10)
      })
    }
  }

  return (
    <div className="page-enter">
      <div className="flex justify-between items-center px-4 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-bold">Minhas <span className="text-primary">faturas</span></h1>
        <MonthSelector value={curMonth} months={months} onChange={onChangeMonth} />
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">
        {CARTOES.map(c => {
          const ocsC = ocs.filter(o => o.l.pagamento === c)
          const total = ocsC.reduce((s, o) => s + o.vp, 0)
          const paga = fin.faturas.find(f => f.cartao === c && f.mes_ref === curMonth)
          const isSc = c.includes('Sicredi')
          const fech = fin.getFechamento(c)

          return (
            <div key={c} className={`bg-white border border-slate-200 rounded-2xl p-4 border-t-4 ${isSc ? 'border-t-emerald-700' : 'border-t-purple-700'}`}>
              <div className="flex justify-between items-start mb-1">
                <div>
                  <div className="text-base font-bold">{c}</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {ocsC.length} item{ocsC.length === 1 ? '' : 's'} · fecha dia {fech}
                    {paga && ` · ✓ paga em ${paga.data_pagamento.slice(8, 10)}/${paga.data_pagamento.slice(5, 7)}`}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${paga ? 'text-emerald-500' : ''}`}>{fmt(total)}</div>
              </div>

              {ocsC.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-1.5 my-3 max-h-60 overflow-y-auto">
                  {[...ocsC].sort((a, b) => a.l.data.localeCompare(b.l.data)).map((o, idx) => (
                    <div key={`${o.l.id}-${o.pn}`} className={`flex justify-between items-center px-3 py-2 rounded-lg ${idx > 0 ? 'border-t border-slate-200' : ''}`}>
                      <div className="text-sm font-medium truncate flex-1">
                        {o.l.descricao || '(sem descrição)'}
                        {o.pt > 1 && <span className="text-amber-500 text-[10px] font-bold ml-2 whitespace-nowrap">{o.pn}/{o.pt}</span>}
                      </div>
                      <div className="text-sm font-bold ml-3 whitespace-nowrap">{fmt(o.vp)}</div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => togPagar(c)} disabled={total === 0 && !paga}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${paga ? 'bg-white border border-slate-200 text-slate-600' : 'bg-primary text-white disabled:bg-slate-100 disabled:text-slate-400'}`}>
                {paga ? '↺ Desfazer' : 'Marcar como paga'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
