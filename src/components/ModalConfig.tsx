'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { supabase } from '@/lib/supabase'
import type { Categoria } from '@/lib/types'

const CORES_DISP = ['#1FBED6','#0E7490','#10B981','#C9C422','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#14B8A6','#6366F1','#84CC16','#94A3B8','#0EA5E9','#D946EF']

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  onClose: () => void
}

export default function ModalConfig({ user, fin, onClose }: Props) {
  const [sc, setSc] = useState(fin.cfg.fechamento_sicredi)
  const [nb, setNb] = useState(fin.cfg.fechamento_nubank)
  const [cats, setCats] = useState<Categoria[]>(fin.cats)
  const [saving, setSaving] = useState(false)
  const [colorIdx, setColorIdx] = useState<number | null>(null)

  function updateCat(idx: number, partial: Partial<Categoria>) {
    setCats(prev => prev.map((c, i) => i === idx ? { ...c, ...partial } : c))
  }

  function addCat() {
    setCats(prev => [...prev, {
      id: crypto.randomUUID(), user_id: user.id, nome: 'Nova categoria',
      cor: CORES_DISP[Math.floor(Math.random() * CORES_DISP.length)], ordem: prev.length
    }])
  }

  function delCat(id: string) {
    if (cats.length <= 1) { alert('Mínimo 1 categoria'); return }
    if (!confirm('Excluir categoria?')) return
    setCats(prev => prev.filter(c => c.id !== id))
  }

  async function salvar() {
    if (sc < 1 || sc > 31 || nb < 1 || nb > 31) { alert('Dia inválido'); return }
    setSaving(true)
    try {
      await fin.saveConfig({ fechamento_sicredi: sc, fechamento_nubank: nb })
      await fin.saveCategorias(cats)
      onClose()
    } catch (e) { alert('Erro ao salvar') } finally { setSaving(false) }
  }

  async function handleLogout() {
    if (!confirm('Sair da conta?')) return
    await supabase.auth.signOut()
    location.reload()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 max-h-[93vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-4">Configurações</h2>

        <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">Fechamento das faturas</h3>
        <p className="text-xs text-slate-400 mb-3">Compras até este dia entram na fatura do mês atual; depois, no próximo.</p>
        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex justify-between items-center py-1">
            <div className="text-sm font-bold">Sicredi Mastercard Black</div>
            <input type="number" min="1" max="31" value={sc} onChange={e => setSc(parseInt(e.target.value) || 5)}
              className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold text-sm" />
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-2">
            <div className="text-sm font-bold">Nubank Platinum</div>
            <input type="number" min="1" max="31" value={nb} onChange={e => setNb(parseInt(e.target.value) || 25)}
              className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center font-bold text-sm" />
          </div>
        </div>

        <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Categorias</h3>
        <div className="space-y-1 mb-2">
          {cats.map((c, idx) => (
            <div key={c.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-b-0">
              <button onClick={() => setColorIdx(idx)} className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: c.cor }} />
              <input value={c.nome} onChange={e => updateCat(idx, { nome: e.target.value })}
                className="flex-1 bg-transparent border-0 focus:outline-none text-sm font-semibold" placeholder="Nome" />
              <button onClick={() => delCat(c.id)} className="text-slate-400 active:text-red-500 px-2">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addCat} className="w-full text-primary font-bold text-sm py-2 mb-4">+ Adicionar categoria</button>

        <h3 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-2">Conta</h3>
        <div className="text-sm text-slate-500 mb-3">Logado como: <strong>{user.email}</strong></div>
        <button onClick={handleLogout} className="w-full border border-slate-200 text-red-500 py-2.5 rounded-xl font-semibold text-sm mb-4">Sair da conta</button>

        <button onClick={salvar} disabled={saving} className="w-full bg-primary disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-sm">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        <button onClick={onClose} className="w-full text-slate-400 py-3 text-sm font-semibold">Fechar</button>

        {colorIdx !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setColorIdx(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-4">Escolher cor</h2>
              <div className="flex flex-wrap gap-2.5 py-2">
                {CORES_DISP.map(cor => (
                  <button key={cor} onClick={() => { updateCat(colorIdx, { cor }); setColorIdx(null) }}
                    className={`w-8 h-8 rounded-full border-2 ${cats[colorIdx]?.cor === cor ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ background: cor }} />
                ))}
              </div>
              <button onClick={() => setColorIdx(null)} className="w-full text-slate-400 py-3 text-sm font-semibold mt-3">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
