export interface User {
  id: number
  email: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export type Priority = 'high' | 'medium' | 'low'
export type StatusFilter = 'all' | 'active' | 'completed'
export type SortKey = 'manual' | 'due_date' | 'priority' | 'created_at'

export interface Tab {
  id: number
  name: string
  order: number
  created_at: string
  incomplete_count: number
}

export interface Task {
  id: number
  tab_id: number
  title: string
  description: string | null
  is_completed: boolean
  priority: Priority
  due_date: string | null // YYYY-MM-DD
  order: number
  created_at: string
  updated_at: string
}

export interface TaskCreateInput {
  tab_id: number
  title: string
  description?: string | null
  priority?: Priority
  due_date?: string | null
}

export type TaskUpdateInput = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>

export interface TaskListParams {
  status: StatusFilter
  sort: SortKey
  q?: string
}
