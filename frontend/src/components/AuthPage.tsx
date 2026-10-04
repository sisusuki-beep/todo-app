import { Check, Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cn } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { Button, fieldClass } from './ui/button'

/** バックエンドのルールと同じ: 半角英小文字と数字のみ・両方を含む・8文字以上 */
const RULES = [
  { label: '8文字以上', test: (p: string) => p.length >= 8 },
  { label: '英小文字を含む', test: (p: string) => /[a-z]/.test(p) },
  { label: '数字を含む', test: (p: string) => /[0-9]/.test(p) },
  { label: '英小文字と数字のみ', test: (p: string) => p.length > 0 && /^[a-z0-9]+$/.test(p) },
]

export function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const isRegister = mode === 'register'
  const passwordOk = RULES.every((r) => r.test(password)) && password.length <= 72
  const canSubmit = email.trim() !== '' && password !== '' && (!isRegister || passwordOk) && !pending

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError(null)
    try {
      await (isRegister ? register : login)(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Check className="h-7 w-7" strokeWidth={3} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{isRegister ? 'アカウントを作成' : 'ログイン'}</h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? 'メールアドレスとパスワードを登録します' : 'ToDo にログインして続けましょう'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium">
              パスワード
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={show ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                maxLength={isRegister ? 72 : 128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={isRegister ? 'password-rules' : undefined}
                className={cn(fieldClass, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {isRegister && (
              <ul id="password-rules" className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {RULES.map((r) => {
                  const ok = r.test(password)
                  return (
                    <li
                      key={r.label}
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                      )}
                    >
                      <Check className={cn('h-3.5 w-3.5', !ok && 'opacity-30')} strokeWidth={3} />
                      {r.label}
                      <span className="sr-only">{ok ? '（達成）' : '（未達成）'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {pending ? '処理中…' : isRegister ? '登録する' : 'ログイン'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isRegister ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでない方は'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isRegister ? 'ログイン' : '新規登録'}
          </button>
        </p>
      </div>
    </div>
  )
}
