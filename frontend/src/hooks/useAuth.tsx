import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { getToken, setToken, setUnauthorizedHandler } from '../api/client'
import type { AuthResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  /** 保存済みトークンの検証中 */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => getToken() !== null)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    qc.clear() // 前のユーザーのデータを残さない
  }, [qc])

  // 起動時: 保存済みトークンが有効か確認
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    authApi
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setToken(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // セッション切れ（401）でログイン画面に戻す
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const accept = useCallback(
    (res: AuthResponse) => {
      qc.clear()
      setToken(res.access_token)
      setUser(res.user)
    },
    [qc],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => accept(await authApi.login(email, password)),
      register: async (email, password) => accept(await authApi.register(email, password)),
      logout,
    }),
    [user, loading, accept, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
