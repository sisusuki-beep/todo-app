import { Plus } from 'lucide-react'
import { Button } from './ui/button'

const COPY = {
  empty: { title: 'タスクはまだありません', body: '最初のタスクを追加して、今日を始めましょう。' },
  filtered: { title: '該当するタスクがありません', body: '絞り込み条件を変えてみてください。' },
  search: { title: '見つかりませんでした', body: '別のキーワードで検索してみてください。' },
}

export function EmptyState({ kind, onAdd }: { kind: keyof typeof COPY; onAdd: () => void }) {
  const { title, body } = COPY[kind]
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <svg width="140" height="120" viewBox="0 0 140 120" fill="none" aria-hidden className="mb-6">
        <ellipse cx="70" cy="108" rx="44" ry="6" className="fill-muted" />
        <rect x="26" y="22" width="88" height="80" rx="14" className="fill-card stroke-border" strokeWidth="2" />
        <rect x="40" y="38" width="16" height="16" rx="8" className="stroke-primary" strokeWidth="2.5" />
        <rect x="64" y="41" width="38" height="4" rx="2" className="fill-muted" />
        <rect x="64" y="49" width="24" height="4" rx="2" className="fill-muted" />
        <path d="M43.5 75l4 4 8-9" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="64" y="72" width="38" height="4" rx="2" className="fill-muted" />
        <circle cx="112" cy="26" r="9" className="fill-primary" />
        <path d="M112 21v10M107 26h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {kind === 'empty' && (
        <Button onClick={onAdd} className="mt-5">
          <Plus className="h-4 w-4" />
          タスクを追加
        </Button>
      )}
    </div>
  )
}
