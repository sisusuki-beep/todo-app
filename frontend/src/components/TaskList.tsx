import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import type { Task } from '../types'
import { EmptyState } from './EmptyState'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: Task[] | undefined
  loading: boolean
  sortable: boolean
  tabNames?: Map<number, string> // 横断検索時のみ渡す
  emptyKind: 'empty' | 'filtered' | 'search'
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onMove: (id: number, order: number) => void
  onAdd: () => void
}

export function TaskList({
  tasks,
  loading,
  sortable,
  tabNames,
  emptyKind,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  onAdd,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (loading || !tasks) return <TaskSkeleton />
  if (tasks.length === 0) return <EmptyState kind={emptyKind} onAdd={onAdd} />

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const to = tasks.findIndex((t) => t.id === over.id)
    if (to >= 0) onMove(Number(active.id), to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2.5">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              tabName={tabNames?.get(task.tab_id)}
              sortable={sortable}
              onToggle={() => onToggle(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function TaskSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="読み込み中">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 rounded-xl border bg-card p-4 pl-5">
          <div className="h-6 w-6 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
