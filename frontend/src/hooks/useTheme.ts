import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function initial(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('theme', next)
      } catch {
        /* 保存できなくても動作には影響しない */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
