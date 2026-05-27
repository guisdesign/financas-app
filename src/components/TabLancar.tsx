'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import { PAGAMENTOS, CATS_DEFAULT, fmt, addMonth, mlbl } from '@/lib/types'
import type { Lancamento, Recorrente } from '@/lib/types'

interface Props {
  user: User
  fin: ReturnType<typeof useFinancas>
  editLanc?: Lancamento | null
  confirmPrevKey?: string | null
  onSaved: (mes: string) => void
  onCancel: () => void
}

export default function TabLancar({ user, fin, editLanc, confirmPrevKey, onSaved, onCancel }: Props) {
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [cat, setCat] = useState<string | null>(null)
  const [pay, setPay] = useState<string | null>(null)
  const [parcelas, setParcelas] = useState(1)
  const [casaRio, setCasaRio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showRecPicker, setShowRecPicker] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (editLanc) {
      setValor(editLanc.valor.toFixed(2).replace('.', ','))
      setDesc(editLanc.descricao || '')
      setData(editLanc.data)
      setCat(editLanc.categoria)
      setPay(editLanc.pagamento)
      setParcelas(editLanc.parcelas || 1)
      setCasaRio(!!editLanc.casa_rio)
    } else if (confirmPrevKey) {
      const [recId] = confirmPrevKey.split('::')
      const r = fin.recorrentes.find(x => x.id === recId)
      if (r) {
        setValor(r.valor.toFixed(2).replace('.', ','))
        setDesc(r.nome)
        setCat(r.categoria)
        setCasaRio(!!r.casa_rio)
      }
    }
  }, [editLanc, confirmPrevKey])

  function maskValor(v: string) {
    const digits = v.replace(/\D/g, '')
    if (!digits || digits === '0' || digits === '00') { setValor(''); return }
    setValor((parseInt(digits) / 100).toFixed(2).replace('.', ','))
  }

  function getParcelInfo() {
    const isCartao = PAGAMENTOS.find(p => p.nome === pay)?.tipo === 'cartao'
    if (parcelas <= 1 || !isCartao || !pay || !data) return null
    const vp = parseFloat(valor.replace(',', '.').replace(/\.(?=.*,)/g, '')) / parcelas
    const mi = fin.mesFatura(data, pay, 0)
    const mf = fin.mesFatura(data, pay, parcelas - 1)
    return { vp, mi, mf }
  }

  async function handleSalvar() {
    const v = parseFloat(valor.replace(',', '.').replace(/\.(?=.*\d{3},)/g, '')) || 0
    if (!v || v <= 0) { setErr('Informe o valor'); return }
    if (!cat) { setErr('Escolha uma categoria'); return }
    if (!pay) { setErr('Escolha o pagamento'); return }
    if (!data) { setErr('Informe a data'); return }
    setErr(''); setSaving(true)

    const isCartao = PAGAMENTOS.find(p => p.nome === pay)?.tipo === 'cartao'
    const parc = isCartao ? parcelas : 1

    try {
      const id = editLanc?.id || crypto.randomUUID()
      const lanc: Lancamento = {
        id, user_id: user.id, valor: v, descricao: desc,
        categoria: cat, pagamento: pay, data, casa_rio: casaRio, parcelas: parc,
        rec_id: editLanc?.rec_id || null,
        previsto_key: editLanc?.previsto_key || confirmPrevKey || null,
      }

      await fin.saveLancamento(lanc)

      if (confirmPrevKey) {
        await fin.savePrevisto(confirmPrevKey, {
          user_id: user.id, chave: confirmPrevKey,
          status: 'confirmado', lancamento_id: id
        })
      }

      const oc = fin.gerarOcs(lanc)[0]
      onSaved(oc?.mes || data.slice(0, 7))
    } catch (e) {
      setErr('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir() {
    if (!editLanc) return
    if (!confirm('Excluir este lançamento?')) return
    setSaving(true)
    try {
      if (editLanc.previsto_key && fin.previstos[editLanc.previsto_key]) {
        await fin.savePrevisto(editLanc.previsto_key, null)
      }
      await fin.saveLancamento(editLanc, true)
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  function aplicarRec(r: Recorrente) {
    setValor(r.valor.toFixed(2).replace('.', ','))
    setDesc(r.nome)
    setCat(r.categoria)
    setCasaRio(!!r.casa_rio)
    setShowRecPicker(false)
  }

  const cats = fin.cats.length > 0 ? fin.cats : CATS_DEFAULT.map(c => ({ ...c, user_id: user.id }))
  const isCartao = PAGAMENTOS.find(p => p.nome === pay)?.tipo === 'cartao'
  const parcInfo = getParcelInfo()

  return (
    <div className="page-enter">
      <div className="flex justify-between items-center px-4 pt-5 pb-2 max-w-lg mx-auto">
        <h1 className="text-xl font-bold">{editLanc ? 'Editar' : 'Novo'} <span className="text-primary">gasto</span></h1>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${fin.syncError ? 'bg-red-400' : fin.syncing ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
          <span className="text-xs text-slate-400 font-medium">{fin.syncError ? 'erro' : fin.syncing ? 'salvando...' : 'online'}</span>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">
        {!editLanc && (
          <button onClick={() => setShowRecPicker(true)} className="w-full flex items-center gap-3 bg-sky-50 border border-primary/30 text-primary-dark px-4 py-3 rounded-xl font-bold text-sm active:bg-primary active:text-white transition-colors">
            <span className="text-base">⚡</span>
            <span>Usar gasto recorrente</span>
            {fin.recorrentes.length > 0 && <span className="ml-auto text-slate-400 font-normal text-xs">{fin.recorrentes.length} cadastrado{fin.recorrentes.length !== 1 ? 's' : ''}</span>}
          </button>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          {/* Valor */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Valor (R$)</label>
            <input type="text" inputMode="decimal" value={valor} onChange={e => maskValor(e.target.value)}
              placeholder="0,00" className="inp-money w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-4 transition-colors" />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Descrição</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Mercado Zaffari" className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium transition-colors" />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c.id} onClick={() => setCat(c.nome)}
                  className={`px-3 py-2 rounded-full border text-sm font-semibold transition-all ${cat === c.nome ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Pagamento</label>
            <div className="flex flex-wrap gap-2">
              {PAGAMENTOS.map(p => (
                <button key={p.nome} onClick={() => { setPay(p.nome); if (PAGAMENTOS.find(x => x.nome === p.nome)?.tipo !== 'cartao') setParcelas(1) }}
                  className={`px-3 py-2 rounded-full border text-sm font-semibold transition-all ${pay === p.nome ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {p.short}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium transition-colors" />
          </div>

          {/* Parcelamento */}
          {isCartao && (
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2 block">Parcelamento</label>
              <select value={parcelas} onChange={e => setParcelas(parseInt(e.target.value))}
                className="w-full border border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium transition-colors bg-white">
                {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}x{n === 1 ? ' (à vista)' : ''}</option>
                ))}
              </select>
              {parcInfo && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <strong>{parcelas}x de {fmt(parcInfo.vp)}</strong> · 1ª: {mlbl(parcInfo.mi)} · Última: {mlbl(parcInfo.mf)}
                </div>
              )}
            </div>
          )}

          {/* Casa do Rio */}
          <button onClick={() => setCasaRio(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${casaRio ? 'bg-purple-50 border-purple-400' : 'bg-white border-slate-200'}`}>
            <div>
              <div className="text-sm font-semibold text-left">🏡 Casa do Rio</div>
              <div className="text-xs text-slate-400">Coisas pra barragem</div>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${casaRio ? 'bg-purple-500' : 'bg-slate-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform ${casaRio ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}

        <button onClick={handleSalvar} disabled={saving}
          className="w-full bg-primary disabled:bg-slate-300 text-white py-4 rounded-xl font-bold text-base transition-colors">
          {saving ? 'Salvando...' : editLanc ? 'Atualizar lançamento' : confirmPrevKey ? 'Confirmar previsto' : 'Salvar lançamento'}
        </button>

        {editLanc && (
          <button onClick={handleExcluir} disabled={saving}
            className="w-full border border-slate-200 text-red-500 py-3 rounded-xl font-semibold text-sm">
            Excluir lançamento
          </button>
        )}

        <button onClick={onCancel} className="w-full text-slate-400 py-3 text-sm font-semibold">Cancelar</button>
      </div>

      {/* Rec Picker */}
      {showRecPicker && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowRecPicker(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-1">Usar gasto recorrente</h2>
            <p className="text-sm text-slate-400 mb-4">Selecione para preencher o formulário.</p>
            {fin.recorrentes.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhum recorrente cadastrado ainda.</p>
            ) : fin.recorrentes.map(r => {
              const cat = fin.cats.find(c => c.nome === r.categoria)
              return (
                <button key={r.id} onClick={() => aplicarRec(r)}
                  className="w-full flex justify-between items-center p-3 rounded-xl border border-slate-200 mb-2 active:bg-sky-50 active:border-primary transition-colors">
                  <div className="text-left">
                    <div className="font-bold text-sm">{r.nome}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: cat?.cor || '#94A3B8' }} />
                      {r.categoria}
                    </div>
                  </div>
                  <span className="font-bold text-sm">{fmt(r.valor)}</span>
                </button>
              )
            })}
            <button onClick={() => setShowRecPicker(false)} className="w-full text-slate-400 py-3 text-sm font-semibold mt-2">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
