import { Check, LogOut, Moon, Plus, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { TabBar } from './components/TabBar'
import { TabModal } from './components/TabModal'
import { TaskList } from './components/TaskList'
import { TaskModal } from './components/TaskModal'
import { Toolbar } from './components/Toolbar'
import { Button } from './components/ui/button'
import { useAuth } from './hooks/useAuth'
import { useDebounced } from './hooks/useDebounced'
import { useCreateTab, useDeleteTab, useMoveTab, useRenameTab, useTabs } from './hooks/useTabs'
import { useTheme } from './hooks/useTheme'
import {
  tasksKey,
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useSearchTasks,
  useTasks,
  useToggleTask,
  useUpdateTask,
} from './hooks/useTasks'
import type { SortKey, StatusFilter, Tab, Task, TaskListParams } from './types'

const ACTIVE_TAB_KEY = 'activeTabId'

function loadActiveTab(): number | null {
  try {
    const v = localStorage.getItem(ACTIVE_TAB_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : null)

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  // ---- タブ ----
  const tabsQuery = useTabs()
  const tabs = tabsQuery.data ?? []
  const [selectedId, setSelectedId] = useState<number | null>(loadActiveTab)
  // 選択中のタブが削除された場合などは先頭にフォールバック
  const activeTab = tabs.find((t) => t.id === selectedId) ?? tabs[0] ?? null
  const activeId = activeTab?.id ?? null

  const selectTab = (id: number) => {
    setSelectedId(id)
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, String(id))
    } catch {
      /* noop */
    }
  }

  const createTab = useCreateTab()
  const renameTab = useRenameTab()
  const deleteTab = useDeleteTab()
  const moveTab = useMoveTab()

  const [tabModal, setTabModal] = useState<{ tab: Tab | null } | null>(null)
  const [tabToDelete, setTabToDelete] = useState<Tab | null>(null)

  // ---- タスク（表示条件） ----
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('manual')
  const [query, setQuery] = useState('')
  const [allTabs, setAllTabs] = useState(false)
  const debouncedQuery = useDebounced(query.trim())

  const searching = allTabs && debouncedQuery.length > 0
  const params: TaskListParams = {
    status,
    sort,
    q: !allTabs && debouncedQuery ? debouncedQuery : undefined,
  }
  const searchParams: TaskListParams = { status, sort }

  const tabTasks = useTasks(searching ? null : activeId, params)
  const searchResults = useSearchTasks(debouncedQuery, searchParams, searching)
  const list = searching ? searchResults : tabTasks

  const tabNames = useMemo(() => new Map(tabs.map((t) => [t.id, t.name])), [tabs])
  // 並び替えはフィルタ・検索なしの手動順のときだけ有効
  const sortable = !searching && sort === 'manual' && status === 'all' && !debouncedQuery
  const emptyKind = debouncedQuery ? 'search' : status !== 'all' ? 'filtered' : 'empty'

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTask = useToggleTask()
  const moveTask = useMoveTask()

  const [taskModal, setTaskModal] = useState<{ task: Task | null } | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const closeTabModal = () => {
    setTabModal(null)
    createTab.reset()
    renameTab.reset()
  }
  const closeTaskModal = () => {
    setTaskModal(null)
    createTask.reset()
    updateTask.reset()
  }

  const incomplete = activeTab?.incomplete_count ?? 0

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <span className="text-lg font-bold tracking-tight">ToDo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:inline" title={user?.email}>
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label={`ログアウト（${user?.email ?? ''}）`}
              title="ログアウト"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Button className="hidden md:inline-flex" disabled={!activeTab} onClick={() => setTaskModal({ task: null })}>
              <Plus className="h-4 w-4" />
              タスクを追加
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4 md:grid md:grid-cols-[240px_1fr] md:gap-8 md:py-8">
        <TabBar
          tabs={tabs}
          loading={tabsQuery.isLoading}
          activeId={activeId}
          onSelect={selectTab}
          onCreate={() => setTabModal({ tab: null })}
          onRename={(tab) => setTabModal({ tab })}
          onDelete={setTabToDelete}
          onMove={(id, order) => moveTab.mutate({ id, order })}
        />

        <main className="mt-4 min-w-0 pb-24 md:mt-0 md:pb-0">
          {tabsQuery.isError ? (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="font-medium text-destructive">{msg(tabsQuery.error)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                バックエンド（http://localhost:8000）が起動しているか確認してください。
              </p>
              <Button variant="secondary" className="mt-4" onClick={() => tabsQuery.refetch()}>
                再読み込み
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {searching ? '検索結果' : (activeTab?.name ?? ' ')}
                </h1>
                {activeTab && !searching && (
                  <p className="shrink-0 text-sm text-muted-foreground">未完了 {incomplete} 件</p>
                )}
              </div>

              <Toolbar
                query={query}
                onQuery={setQuery}
                allTabs={allTabs}
                onAllTabs={setAllTabs}
                status={status}
                onStatus={setStatus}
                sort={sort}
                onSort={setSort}
              />

              <div className="mt-4">
                {list.isError ? (
                  <p role="alert" className="py-10 text-center text-sm text-destructive">
                    {msg(list.error)}
                  </p>
                ) : (
                  <TaskList
                    tasks={list.data}
                    loading={list.isLoading || tabsQuery.isLoading}
                    sortable={sortable}
                    tabNames={searching ? tabNames : undefined}
                    emptyKind={emptyKind}
                    onToggle={(t) => toggleTask.mutate(t.id)}
                    onEdit={(task) => setTaskModal({ task })}
                    onDelete={setTaskToDelete}
                    onMove={(id, order) =>
                      activeId !== null &&
                      moveTask.mutate({ id, order, queryKey: tasksKey(activeId, params) })
                    }
                    onAdd={() => setTaskModal({ task: null })}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* スマホ用の追加ボタン */}
      <button
        onClick={() => setTaskModal({ task: null })}
        disabled={!activeTab}
        aria-label="タスクを追加"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-50 md:hidden"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TabModal
        open={tabModal !== null}
        tab={tabModal?.tab ?? null}
        pending={createTab.isPending || renameTab.isPending}
        error={msg(createTab.error) ?? msg(renameTab.error)}
        onClose={closeTabModal}
        onSubmit={(name) => {
          if (tabModal?.tab) {
            renameTab.mutate({ id: tabModal.tab.id, name }, { onSuccess: closeTabModal })
          } else {
            createTab.mutate(name, {
              onSuccess: (tab) => {
                selectTab(tab.id)
                closeTabModal()
              },
            })
          }
        }}
      />

      <TaskModal
        open={taskModal !== null}
        task={taskModal?.task ?? null}
        tabs={tabs}
        defaultTabId={activeId}
        pending={createTask.isPending || updateTask.isPending}
        error={msg(createTask.error) ?? msg(updateTask.error)}
        onClose={closeTaskModal}
        onSubmit={(data) => {
          if (taskModal?.task) {
            updateTask.mutate({ id: taskModal.task.id, data }, { onSuccess: closeTaskModal })
          } else {
            createTask.mutate(data, { onSuccess: closeTaskModal })
          }
        }}
      />

      <ConfirmDialog
        open={tabToDelete !== null}
        title="タブを削除しますか？"
        description={`「${tabToDelete?.name ?? ''}」とその中のすべてのタスクが削除されます。この操作は取り消せません。`}
        pending={deleteTab.isPending}
        error={msg(deleteTab.error)}
        onCancel={() => {
          setTabToDelete(null)
          deleteTab.reset()
        }}
        onConfirm={() =>
          tabToDelete &&
          deleteTab.mutate(tabToDelete.id, { onSuccess: () => setTabToDelete(null) })
        }
      />

      <ConfirmDialog
        open={taskToDelete !== null}
        title="タスクを削除しますか？"
        description={`「${taskToDelete?.title ?? ''}」を削除します。`}
        pending={deleteTask.isPending}
        error={msg(deleteTask.error)}
        onCancel={() => {
          setTaskToDelete(null)
          deleteTask.reset()
        }}
        onConfirm={() =>
          taskToDelete &&
          deleteTask.mutate(taskToDelete.id, { onSuccess: () => setTaskToDelete(null) })
        }
      />
    </div>
  )
}
