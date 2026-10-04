import type { Tab } from '../types'
import { request } from './client'

export const tabsApi = {
  list: () => request<Tab[]>('/tabs'),
  create: (name: string) =>
    request<Tab>('/tabs', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: number, data: { name?: string; order?: number }) =>
    request<Tab>(`/tabs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/tabs/${id}`, { method: 'DELETE' }),
}
