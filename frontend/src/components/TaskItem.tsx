import * as Checkbox from '@radix-ui/react-checkbox'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, Check, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { cn, formatDue, isOverdue } from '../lib/utils'
import type { Priority, Task } from '../types'
import { PRIORITY_LABEL } from './TaskModal'

const BAR: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
}

const CHIP: Record<Priority, string> = {
  high: 'bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  low: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

interface Props {
  task: Task
  tabName?: string
  sortable: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TaskItem({ task, tabName, sortable, onToggle, onEdit, onDelete }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !sortable,
  })
  const overdue = isOverdue(task.due_date, task.is_completed)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative flex animate-item-in items-start gap-3 overflow-hidden rounded-xl border bg-card py-3 pl-5 pr-3 shadow-sm transition-shadow hover:shadow-md',
        overdue && 'border-destructive/40',
        isDragging && 'z-10 shadow-xl ring-2 ring-primary/40',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', BAR[task.priority])} />

      <Checkbox.Root
        checked={task.is_completed}
        onCheckedChange={onToggle}
        aria-label={`${task.title} を${task.is_completed ? '未完了' : '完了'}にする`}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          task.is_completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary',
        )}
      >
        <Checkbox.Indicator className="animate-check-pop">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </Checkbox.Indicator>
      </Checkbox.Root>

      <button onClick={onEdit} className="min-w-0 flex-1 rounded-md text-left">
        <span
          className={cn(
            'bg-gradient-to-r from-current to-current bg-[length:0%_1.5px] bg-[position:0_58%] bg-no-repeat font-medium leading-snug transition-[background-size,color] duration-300 [overflow-wrap:anywhere]',
            task.is_completed && 'bg-[length:100%_1.5px] text-muted-foreground',
          )}
        >
          {task.title}
        </span>
        {task.description && (
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{task.description}</span>
        )}
        <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn('rounded-full px-2 py-0.5 font-medium', CHIP[task.priority])}>
            優先度 {PRIORITY_LABEL[task.priority]}
          </span>
          {task.due_date && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                overdue ? 'bg-destructive/10 font-semibold text-destructive' : 'bg-muted text-muted-foreground',
              )}
            >
              <CalendarDays className="h-3 w-3" />
              {overdue && '期限切れ · '}
              {formatDue(task.due_date)}
            </span>
          )}
          {tabName && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{tabName}</span>}
        </span>
      </button>

      <div className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <IconBtn label="編集" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="削除" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconBtn>
        {sortable && (
          <button
            {...attributes}
            {...listeners}
            aria-label="ドラッグして並び替え"
            className="cursor-grab touch-none rounded-md p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  )
}

function IconBtn({
  label,
  danger,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'rounded-md p-1.5 text-muted-foreground hover:bg-muted',
        danger ? 'hover:text-destructive' : 'hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
