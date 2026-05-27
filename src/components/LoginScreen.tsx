'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit() {
    setError(''); setInfo('')
    if (!email || !email.includes('@')) { setError('Informe um email válido'); return }
    if (password.length < 6) { setError('A senha precisa ter ao menos 6 caracteres'); return }

    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        if (error.message.includes('Invalid login')) setError('Email ou senha incorretos')
        else setError('Erro: ' + error.message)
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) {
        if (error.message.includes('already registered')) setError('Este email já está cadastrado. Tente fazer login.')
        else setError('Erro: ' + error.message)
        return
      }
      if (data.session) {
        // Login automático bem-sucedido
        return
      }
      setInfo('Conta criada! Você já pode fazer login.')
      setMode('login')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
      <div className="text-5xl mb-5">💰</div>
      <h1 className="text-2xl font-extrabold mb-2">Minhas <span className="text-primary">finanças</span></h1>
      <p className="text-slate-500 mb-8 max-w-xs leading-relaxed">
        {mode === 'login' ? 'Entre com seu email e senha.' : 'Crie sua conta para começar.'}
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-5">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>

        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border-2 border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium mb-3 transition-colors"
          placeholder="seu@email.com" inputMode="email" autoComplete="email"
        />

        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="w-full border-2 border-slate-200 focus:border-primary focus:outline-none rounded-xl px-4 py-3 text-base font-medium mb-3 transition-colors"
          placeholder="senha (mín. 6 caracteres)"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full bg-primary disabled:bg-slate-300 text-white py-3 rounded-xl font-bold text-sm transition-colors mb-3"
        >
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-3 text-left">{error}</p>}
        {info && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 mb-3 text-left">{info}</p>}

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
          className="text-sm text-primary font-semibold"
        >
          {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
