'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { mlbl } from '@/lib/types'

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  curMonth: string
  onClose: () => void
}

export default function ModalBudget({ user, fin, curMonth, onClose }: Props) {
  const [valor, setValor] = useState('')
  const [allMonths, setAllMonths] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const c = fin.getOrc(curMonth)
    if (c > 0) setValor(c.toFixed(2).replace('.', ','))
  }, [])

  function maskValor(v: string) {
    const digits = v.replace(/\D/g, '')
    if (!digits || digits === '0' || digits === '00') { setValor(''); return }
    setValor((parseInt(digits) / 100).toFixed(2).replace('.', ','))
  }

  async function salvar() {
    const v = parseFloat(valor.replace(',', '.').replace(/\.(?=.*\d{3},)/g, '')) || 0
    if (!v || v <= 0) { setErr('Informe o valor'); return }
    setErr(''); setSaving(true)
    try {
      await fin.saveOrcamento(allMonths ? 'default' : curMonth, v)
      onClose()
    } catch (e) { setErr('Erro ao salvar') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-1">Orçamento mensal</h2>
        <p className="text-sm text-slate-500 mb-5">Teto de gastos por mês. Pode ser o pró-labore ou outro valor que faça sentido.</p>

        <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Valor (R$)</label>
        <input type="text" inputMode="decimal" value={valor} onChange={e => maskValor(e.target.value)} autoFocus
          placeholder="0,00" className="inp-money w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-4 mb-4" />

        <button onClick={() => setAllMonths(v => !v)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-4 ${allMonths ? 'bg-purple-50 border-purple-400' : 'bg-white border-slate-200'}`}>
          <div className="text-left">
            <div className="text-sm font-semibold">Todos os meses</div>
            <div className="text-xs text-slate-400">Senão, só {mlbl(curMonth)}</div>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${allMonths ? 'bg-purple-500' : 'bg-slate-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${allMonths ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>

        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-3">{err}</p>}

        <button onClick={salvar} disabled={saving} className="w-full bg-primary disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-sm">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={onClose} className="w-full text-slate-400 py-3 text-sm font-semibold">Cancelar</button>
      </div>
    </div>
  )
}
