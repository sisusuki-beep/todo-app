import type { Task, TaskCreateInput, TaskListParams, TaskUpdateInput } from '../types'
import { qs, request } from './client'

export const tasksApi = {
  list: (tabId: number, p: TaskListParams) =>
    request<Task[]>(`/tabs/${tabId}/tasks${qs({ status: p.status, sort: p.sort, q: p.q })}`),
  search: (q: string, p: TaskListParams) =>
    request<Task[]>(`/tasks${qs({ q, status: p.status, sort: p.sort })}`),
  create: (data: TaskCreateInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: TaskUpdateInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: (id: number) => request<Task>(`/tasks/${id}/toggle`, { method: 'PATCH' }),
  remove: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
}
