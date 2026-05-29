'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useFinancas } from '@/hooks/useFinancas'
import type { Lancamento } from '@/lib/types'
import { thisMonthLocal } from '@/lib/types'
import LoginScreen from '@/components/LoginScreen'
import BottomNav from '@/components/BottomNav'
import TabLancar from '@/components/TabLancar'
import TabMes from '@/components/TabMes'
import TabFaturas from '@/components/TabFaturas'
import TabPlanejar from '@/components/TabPlanejar'
import ModalConfig from '@/components/ModalConfig'
import ModalBudget from '@/components/ModalBudget'

type Tab = 'mes' | 'faturas' | 'lancar' | 'planejar'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('lancar')
  const [curMonth, setCurMonth] = useState(thisMonthLocal())
  const [showConfig, setShowConfig] = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [editLanc, setEditLanc] = useState<Lancamento | null>(null)
  const [confirmPrevKey, setConfirmPrevKey] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAuthLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const fin = useFinancas(user)

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-4" />
        <div className="text-slate-400 text-sm font-semibold">Carregando...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  if (fin.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-4" />
        <div className="text-slate-400 text-sm font-semibold">Carregando dados...</div>
      </div>
    )
  }

  // Months disponíveis
  const monthsSet = new Set([curMonth, thisMonthLocal()])
  fin.lancamentos.forEach(l => fin.gerarOcs(l).forEach(o => monthsSet.add(o.mes)))
  const months = [...monthsSet].sort().reverse()

  function handleTab(t: Tab) {
    if (t === 'lancar') {
      setEditLanc(null)
      setConfirmPrevKey(null)
    }
    setTab(t)
    window.scrollTo(0, 0)
  }

  function handleEditLanc(l: Lancamento) {
    setEditLanc(l)
    setConfirmPrevKey(null)
    setTab('lancar')
    window.scrollTo(0, 0)
  }

  function handleConfirmPrev(key: string) {
    setEditLanc(null)
    setConfirmPrevKey(key)
    setTab('lancar')
    window.scrollTo(0, 0)
  }

  function handleSaved(mes: string) {
    setEditLanc(null)
    setConfirmPrevKey(null)
    setCurMonth(mes)
    setTab('mes')
    window.scrollTo(0, 0)
  }

  return (
    <main className="max-w-lg mx-auto min-h-screen">
      {tab === 'lancar' && (
        <TabLancar
          user={user} fin={fin}
          editLanc={editLanc} confirmPrevKey={confirmPrevKey}
          onSaved={handleSaved}
          onCancel={() => { setEditLanc(null); setConfirmPrevKey(null); setTab('mes') }}
        />
      )}
      {tab === 'mes' && (
        <TabMes
          user={user} fin={fin}
          curMonth={curMonth} months={months}
          onChangeMonth={setCurMonth}
          onOpenConfig={() => setShowConfig(true)}
          onOpenBudget={() => setShowBudget(true)}
          onEditLanc={handleEditLanc}
          onGoFaturas={() => setTab('faturas')}
          onConfirmPrev={handleConfirmPrev}
        />
      )}
      {tab === 'faturas' && (
        <TabFaturas user={user} fin={fin} curMonth={curMonth} months={months} onChangeMonth={setCurMonth} />
      )}
      {tab === 'planejar' && (
        <TabPlanejar user={user} fin={fin} curMonth={curMonth} months={months} onChangeMonth={setCurMonth} />
      )}

      {showConfig && <ModalConfig user={user} fin={fin} onClose={() => setShowConfig(false)} />}
      {showBudget && <ModalBudget user={user} fin={fin} curMonth={curMonth} onClose={() => setShowBudget(false)} />}

      <BottomNav active={tab} onTab={handleTab} />
    </main>
  )
}
