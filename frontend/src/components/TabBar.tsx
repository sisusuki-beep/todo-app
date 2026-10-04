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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Tab } from '../types'

interface Props {
  tabs: Tab[]
  loading: boolean
  activeId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  onRename: (tab: Tab) => void
  onDelete: (tab: Tab) => void
  onMove: (id: number, order: number) => void
}

export function TabBar({ tabs, loading, activeId, onSelect, onCreate, onRename, onDelete, onMove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // スマホでは横スクロールと競合しないよう長押しでドラッグ開始
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const to = tabs.findIndex((t) => t.id === over.id)
    if (to >= 0) onMove(Number(active.id), to)
  }

  return (
    <nav aria-label="タブ" className="md:sticky md:top-20">
      <div className="mb-2 hidden items-center justify-between px-2 md:flex">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">リスト</h2>
        <button
          onClick={onCreate}
          aria-label="タブを追加"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 w-28 shrink-0 animate-pulse rounded-lg bg-muted md:w-full" />
          ))
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tabs.map((t) => t.id)} strategy={rectSortingStrategy}>
              {tabs.map((tab, i) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeId}
                  isFirst={i === 0}
                  isLast={i === tabs.length - 1}
                  canDelete={tabs.length > 1}
                  onSelect={() => onSelect(tab.id)}
                  onRename={() => onRename(tab)}
                  onDelete={() => onDelete(tab)}
                  onMove={(dir) => onMove(tab.id, i + dir)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        <button
          onClick={onCreate}
          aria-label="タブを追加"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary md:hidden"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}

interface ItemProps {
  tab: Tab
  active: boolean
  isFirst: boolean
  isLast: boolean
  canDelete: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}

function TabItem({ tab, active, isFirst, isLast, canDelete, onSelect, onRename, onDelete, onMove }: ItemProps) {
  const { setNodeRef, transform, transition, listeners, isDragging } = useSortable({ id: tab.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, touchAction: 'pan-x pan-y' }}
      {...listeners}
      className={cn(
        'group relative flex shrink-0 items-center rounded-lg border border-transparent text-sm font-medium transition-colors md:shrink',
        active
          ? 'border-border bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg pl-3 pr-2 text-left"
      >
        <span className="truncate">{tab.name}</span>
        {tab.incomplete_count > 0 && (
          <span
            aria-label={`未完了 ${tab.incomplete_count} 件`}
            className={cn(
              'ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums',
              active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {tab.incomplete_count}
          </span>
        )}
      </button>

      {active && (
        <Menu.Root>
          <Menu.Trigger
            aria-label={`${tab.name} のメニュー`}
            className="mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-40 animate-fade-in rounded-xl border bg-card p-1 text-sm shadow-lg"
            >
              <MenuItem icon={Pencil} onSelect={onRename}>
                名前を変更
              </MenuItem>
              <MenuItem icon={ArrowUp} disabled={isFirst} onSelect={() => onMove(-1)}>
                前へ移動
              </MenuItem>
              <MenuItem icon={ArrowDown} disabled={isLast} onSelect={() => onMove(1)}>
                後ろへ移動
              </MenuItem>
              <Menu.Separator className="my-1 h-px bg-border" />
              <MenuItem icon={Trash2} disabled={!canDelete} danger onSelect={onDelete}>
                削除
              </MenuItem>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  danger,
  disabled,
  onSelect,
  children,
}: {
  icon: typeof Pencil
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
  children: string
}) {
  return (
    <Menu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted',
        danger && 'text-destructive',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Menu.Item>
  )
}
