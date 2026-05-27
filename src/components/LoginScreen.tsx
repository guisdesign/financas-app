'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !email.includes('@')) { setError('Informe um email válido'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    setLoading(false)
    if (error) { setError('Erro: ' + error.message); return }
    setSent(true)
  }

  if (sent) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
      <div className="text-5xl mb-5">📬</div>
      <h1 className="text-2xl font-extrabold mb-2">Verifique <span className="text-primary">o email</span></h1>
      <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
        Enviamos um link para <strong>{email}</strong>. Toque no link para entrar.
      </p>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm text-center">
        <p className="text-sm text-slate-500 mb-4">Não recebeu? Confira o spam ou tente novamente.</p>
        <button onClick={() => setSent(false)} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm">
          Tentar outro email
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
      <div className="text-5xl mb-5">💰</div>
      <h1 className="text-2xl font-extrabold mb-2">Minhas <span className="text-primary">finanças</span></h1>
      <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">Entre com o seu email para acessar.</p>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-1">Entrar</h2>
        <p className="text-sm text-slate-500 mb-5">Vamos te enviar um link de acesso. Sem senha necessária.</p>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full border-2 border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium mb-3 transition-colors"
          placeholder="seu@email.com" inputMode="email" autoComplete="email"
        />
        <button
          onClick={handleLogin} disabled={loading}
          className="w-full bg-primary disabled:bg-slate-300 text-white py-3 rounded-xl font-bold text-sm transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar link de acesso'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}
      </div>
    </div>
  )
}
