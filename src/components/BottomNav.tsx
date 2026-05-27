'use client'

type Tab = 'mes' | 'faturas' | 'lancar' | 'planejar'

interface Props {
  active: Tab
  onTab: (t: Tab) => void
}

export default function BottomNav({ active, onTab }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 z-50 max-w-lg mx-auto">
      <button onClick={() => onTab('mes')} className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${active === 'mes' ? 'text-primary' : 'text-slate-400'}`}>
        <span className="text-xl">📊</span>Mês
      </button>
      <button onClick={() => onTab('faturas')} className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${active === 'faturas' ? 'text-primary' : 'text-slate-400'}`}>
        <span className="text-xl">💳</span>Faturas
      </button>
      <button
        onClick={() => onTab('lancar')}
        className="w-13 h-13 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white text-3xl flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-transform mx-2"
        style={{ width: 52, height: 52 }}
      >＋</button>
      <button onClick={() => onTab('planejar')} className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${active === 'planejar' ? 'text-primary' : 'text-slate-400'}`}>
        <span className="text-xl">🎯</span>Planejar
      </button>
    </div>
  )
}
