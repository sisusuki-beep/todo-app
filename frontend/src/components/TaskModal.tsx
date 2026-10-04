import { useState, type FormEvent } from 'react'
import type { Priority, Tab, Task, TaskCreateInput } from '../types'
import { cn } from '../lib/utils'
import { Button, fieldClass } from './ui/button'
import { Dialog } from './ui/dialog'

export const PRIORITY_LABEL: Record<Priority, string> = { high: '高', medium: '中', low: '低' }

const PRIORITY_ACTIVE: Record<Priority, string> = {
  high: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  low: 'border-slate-400 bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

interface Props {
  open: boolean
  task: Task | null // null = 新規作成
  tabs: Tab[]
  defaultTabId: number | null
  pending?: boolean
  error?: string | null
  onSubmit: (data: TaskCreateInput) => void
  onClose: () => void
}

export function TaskModal(props: Props) {
  const { open, task, onClose } = props
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title={task ? 'タスクを編集' : '新しいタスク'}>
      {open && <TaskForm key={task?.id ?? 'new'} {...props} />}
    </Dialog>
  )
}

function TaskForm({ task, tabs, defaultTabId, pending, error, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [tabId, setTabId] = useState<number>(task?.tab_id ?? defaultTabId ?? tabs[0]?.id ?? 0)

  const trimmed = title.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed) return
    onSubmit({
      tab_id: tabId,
      title: trimmed,
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium">
          タイトル <span className="text-destructive">*</span>
        </label>
        <input
          id="task-title"
          autoFocus
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="何をしますか？"
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="task-desc" className="mb-1.5 block text-sm font-medium">
          メモ
        </label>
        <textarea
          id="task-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="詳細（任意）"
          className={cn(fieldClass, 'resize-none')}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">優先度</legend>
        <div className="grid grid-cols-3 gap-2">
          {(['high', 'medium', 'low'] as const).map((p) => (
            <label
              key={p}
              className={cn(
                'flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                priority === p ? PRIORITY_ACTIVE[p] : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="priority"
                value={p}
                checked={priority === p}
                onChange={() => setPriority(p)}
                className="sr-only"
              />
              {PRIORITY_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-due" className="mb-1.5 block text-sm font-medium">
            期限日
          </label>
          <div className="flex gap-1.5">
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
            {dueDate && (
              <Button variant="ghost" size="icon" aria-label="期限日をクリア" onClick={() => setDueDate('')}>
                ✕
              </Button>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="task-tab" className="mb-1.5 block text-sm font-medium">
            タブ
          </label>
          <select
            id="task-tab"
            value={tabId}
            onChange={(e) => setTabId(Number(e.target.value))}
            className={fieldClass}
          >
            {tabs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
        <Button type="submit" disabled={!trimmed || pending}>
          {task ? '保存' : '追加'}
        </Button>
      </div>
    </form>
  )
}
