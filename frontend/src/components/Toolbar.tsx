import { Search, X } from 'lucide-react'
import { cn } from '../lib/utils'
import type { SortKey, StatusFilter } from '../types'
import { fieldClass } from './ui/button'

const STATUS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '未完了' },
  { value: 'completed', label: '完了済み' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'manual', label: '手動（ドラッグ）' },
  { value: 'due_date', label: '期限日順' },
  { value: 'priority', label: '優先度順' },
  { value: 'created_at', label: '新しい順' },
]

interface Props {
  query: string
  onQuery: (v: string) => void
  allTabs: boolean
  onAllTabs: (v: boolean) => void
  status: StatusFilter
  onStatus: (v: StatusFilter) => void
  sort: SortKey
  onSort: (v: SortKey) => void
}

export function Toolbar({ query, onQuery, allTabs, onAllTabs, status, onStatus, sort, onSort }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={allTabs ? '全タブから検索' : 'このタブ内を検索'}
            aria-label="キーワード検索"
            className={cn(fieldClass, 'pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden')}
          />
          {query && (
            <button
              onClick={() => onQuery('')}
              aria-label="検索をクリア"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          aria-pressed={allTabs}
          onClick={() => onAllTabs(!allTabs)}
          className={cn(
            'shrink-0 rounded-lg border px-3 text-sm font-medium transition-colors',
            allTabs ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          全タブ
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="表示フィルタ" className="inline-flex rounded-lg bg-muted p-1">
          {STATUS.map((s) => (
            <button
              key={s.value}
              aria-pressed={status === s.value}
              onClick={() => onStatus(s.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                status === s.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          並び順
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="rounded-lg border bg-card py-1.5 pl-2 pr-1 text-sm text-foreground"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
