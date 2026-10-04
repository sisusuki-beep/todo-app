import { useState, type FormEvent } from 'react'
import type { Tab } from '../types'
import { Button, fieldClass } from './ui/button'
import { Dialog } from './ui/dialog'

interface Props {
  open: boolean
  tab: Tab | null // null = 新規作成
  pending?: boolean
  error?: string | null
  onSubmit: (name: string) => void
  onClose: () => void
}

export function TabModal({ open, tab, pending, error, onSubmit, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={tab ? 'タブ名を変更' : '新しいタブ'}>
      {/* open の度に初期値をリセットするため key で再マウント */}
      {open && <TabForm key={tab?.id ?? 'new'} tab={tab} pending={pending} error={error} onSubmit={onSubmit} onClose={onClose} />}
    </Dialog>
  )
}

function TabForm({ tab, pending, error, onSubmit, onClose }: Omit<Props, 'open'>) {
  const [name, setName] = useState(tab?.name ?? '')
  const trimmed = name.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="tab-name" className="mb-1.5 block text-sm font-medium">
          タブ名
        </label>
        <input
          id="tab-name"
          autoFocus
          required
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 仕事、買い物、勉強"
          className={fieldClass}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        <Button type="submit" disabled={!trimmed || pending}>
          {tab ? '保存' : '作成'}
        </Button>
      </div>
    </form>
  )
}
