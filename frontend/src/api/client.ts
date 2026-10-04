const BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'authToken'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---- 認証トークン（localStorageが使えない環境でもメモリ上で動くようにする） ----
let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token: string | null): void {
  memoryToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

// トークンが期限切れ・無効になったとき（401）に呼ばれる
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn
}

function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string }
    if (first.loc?.includes('email')) return 'メールアドレスの形式が正しくありません'
    if (first.msg?.startsWith('Value error, ')) return first.msg.slice('Value error, '.length)
    return '入力内容が正しくありません'
  }
  return `リクエストに失敗しました (${status})`
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'サーバーに接続できません')
  }
  if (!res.ok) {
    // ログイン済みのときの401 = セッション切れ。ログイン画面へ戻す
    if (res.status === 401 && token) onUnauthorized?.()
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, errorMessage(res.status, body))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
  const s = sp.toString()
  return s ? `?${s}` : ''
}
