import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ローカル日付の YYYY-MM-DD */
export function todayString(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function isOverdue(due: string | null, completed: boolean): boolean {
  return !!due && !completed && due < todayString()
}

export function formatDue(due: string): string {
  const [y, m, d] = due.split('-').map(Number)
  const today = todayString()
  const date = new Date(y, m - 1, d)
  const w = '日月火水木金土'[date.getDay()]
  const base = y === new Date().getFullYear() ? `${m}月${d}日(${w})` : `${y}年${m}月${d}日(${w})`
  if (due === today) return `今日 · ${base}`
  return base
}
