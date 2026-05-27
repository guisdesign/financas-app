'use client'

import { mlbl } from '@/lib/types'

interface Props {
  value: string
  months: string[]
  onChange: (m: string) => void
}

export default function MonthSelector({ value, months, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer"
    >
      {months.map(m => <option key={m} value={m}>{mlbl(m)}</option>)}
    </select>
  )
}
