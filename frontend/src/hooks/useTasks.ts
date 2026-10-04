import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { arrayMove } from '@dnd-kit/sortable'
import { tasksApi } from '../api/tasks'
import type { Task, TaskCreateInput, TaskListParams, TaskUpdateInput } from '../types'

export const tasksKey = (tabId: number, p: TaskListParams) => ['tasks', tabId, p] as const
export const searchKey = (q: string, p: TaskListParams) => ['search', q, p] as const

export function useTasks(tabId: number | null, p: TaskListParams) {
  return useQuery({
    queryKey: tasksKey(tabId ?? -1, p),
    queryFn: () => tasksApi.list(tabId!, p),
    enabled: tabId !== null,
    placeholderData: keepPreviousData,
  })
}

export function useSearchTasks(q: string, p: TaskListParams, enabled: boolean) {
  return useQuery({
    queryKey: searchKey(q, p),
    queryFn: () => tasksApi.search(q, p),
    enabled: enabled && q.length > 0,
    placeholderData: keepPreviousData,
  })
}

function useRefresh() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['tasks'] }),
      qc.invalidateQueries({ queryKey: ['search'] }),
      qc.invalidateQueries({ queryKey: ['tabs'] }),
    ])
}

export function useCreateTask() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (data: TaskCreateInput) => tasksApi.create(data),
    onSuccess: refresh,
  })
}

export function useUpdateTask() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdateInput }) => tasksApi.update(id, data),
    onSuccess: refresh,
  })
}

export function useDeleteTask() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: refresh,
  })
}

/** 完了切り替え。チェックのアニメーションが即座に出るよう楽観的更新する */
export function useToggleTask() {
  const qc = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: number) => tasksApi.toggle(id),
    onMutate: async (id) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ['tasks'] }),
        qc.cancelQueries({ queryKey: ['search'] }),
      ])
      const snapshots = [
        ...qc.getQueriesData<Task[]>({ queryKey: ['tasks'] }),
        ...qc.getQueriesData<Task[]>({ queryKey: ['search'] }),
      ]
      const flip = (old?: Task[]) =>
        old?.map((t) => (t.id === id ? { ...t, is_completed: !t.is_completed } : t))
      qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, flip)
      qc.setQueriesData<Task[]>({ queryKey: ['search'] }, flip)
      return { snapshots }
    },
    onError: (_e, _id, ctx) => ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: refresh,
  })
}

export function useMoveTask() {
  const qc = useQueryClient()
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, order }: { id: number; order: number; queryKey: QueryKey }) =>
      tasksApi.update(id, { order }),
    onMutate: async ({ id, order, queryKey }) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<Task[]>(queryKey)
      if (prev) {
        const from = prev.findIndex((t) => t.id === id)
        qc.setQueryData(queryKey, arrayMove(prev, from, order))
      }
      return { prev, queryKey }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(ctx.queryKey, ctx.prev),
    onSettled: refresh,
  })
}
