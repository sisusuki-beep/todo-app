import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { arrayMove } from '@dnd-kit/sortable'
import { tabsApi } from '../api/tabs'
import type { Tab } from '../types'

export const TABS_KEY = ['tabs'] as const

export function useTabs() {
  return useQuery({ queryKey: TABS_KEY, queryFn: tabsApi.list })
}

export function useCreateTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => tabsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: TABS_KEY }),
  })
}

export function useRenameTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => tabsApi.update(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TABS_KEY }),
  })
}

export function useDeleteTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tabsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABS_KEY })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useMoveTab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, order }: { id: number; order: number }) => tabsApi.update(id, { order }),
    onMutate: async ({ id, order }) => {
      await qc.cancelQueries({ queryKey: TABS_KEY })
      const prev = qc.getQueryData<Tab[]>(TABS_KEY)
      if (prev) {
        const from = prev.findIndex((t) => t.id === id)
        qc.setQueryData(TABS_KEY, arrayMove(prev, from, order))
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(TABS_KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: TABS_KEY }),
  })
}
