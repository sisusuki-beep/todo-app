import App from './App'
import { AuthPage } from './components/AuthPage'
import { useAuth } from './hooks/useAuth'

/** ログイン状態に応じて認証画面とアプリ本体を切り替える */
export default function Root() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="読み込み中">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }
  return user ? <App /> : <AuthPage />
}
