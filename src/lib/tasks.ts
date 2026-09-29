export const STORAGE_KEY = 'taskflow.tasks.v1'

export type Task = {
  id: string
  title: string
  completed: boolean
  dueDate: string | null
  note: string
  createdAt: string
  updatedAt: string
}

export type TaskInput = Pick<Task, 'title'> & Partial<Pick<Task, 'dueDate' | 'note'>>
export type TaskUpdate = Partial<Pick<Task, 'title' | 'dueDate' | 'note' | 'completed'>>
export type TaskFilter = 'all' | 'active' | 'completed'

export function createTask(input: TaskInput, now = new Date(), id = createId()): Task {
  const title = input.title.trim()
  if (!title) throw new Error('A task title is required.')
  const stamp = now.toISOString()
  return {
    id,
    title,
    completed: false,
    dueDate: normalizeDueDate(input.dueDate),
    note: input.note?.trim() ?? '',
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export function addTask(tasks: Task[], input: TaskInput, now = new Date(), id?: string): Task[] {
  return [createTask(input, now, id ?? createId()), ...tasks]
}

export function editTask(tasks: Task[], id: string, changes: TaskUpdate, now = new Date()): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) return task
    const title = changes.title === undefined ? task.title : changes.title.trim()
    if (!title) throw new Error('A task title is required.')
    return {
      ...task,
      ...changes,
      title,
      dueDate: changes.dueDate === undefined ? task.dueDate : normalizeDueDate(changes.dueDate),
      note: changes.note === undefined ? task.note : changes.note.trim(),
      updatedAt: now.toISOString(),
    }
  })
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id)
}

export function filterTasks(tasks: Task[], filter: TaskFilter, query = ''): Task[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return tasks.filter((task) => {
    const matchesStatus = filter === 'all' || (filter === 'active' ? !task.completed : task.completed)
    return matchesStatus && task.title.toLocaleLowerCase().includes(normalizedQuery)
  })
}

export function parseTasks(raw: string | null): Task[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTask).map((task) => ({
      ...task,
      title: task.title.trim(),
      dueDate: normalizeDueDate(task.dueDate),
      note: task.note ?? '',
    })).filter((task) => task.title.length > 0)
  } catch {
    return []
  }
}

export function readTasks(storage: Pick<Storage, 'getItem'> = window.localStorage): Task[] {
  try { return parseTasks(storage.getItem(STORAGE_KEY)) } catch { return [] }
}

export function saveTasks(tasks: Task[], storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export function isDueToday(task: Task, today = localDateKey(new Date())): boolean {
  return !task.completed && task.dueDate === today
}

export function isOverdue(task: Task, today = localDateKey(new Date())): boolean {
  return !task.completed && Boolean(task.dueDate && task.dueDate < today)
}

export function sortByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt)
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt)
  })
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeDueDate(value: string | null | undefined): string | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const task = value as Partial<Task>
  return typeof task.id === 'string' && typeof task.title === 'string' &&
    typeof task.completed === 'boolean' && typeof task.createdAt === 'string' &&
    typeof task.updatedAt === 'string' && (task.note === undefined || typeof task.note === 'string') &&
    (task.dueDate === undefined || task.dueDate === null || typeof task.dueDate === 'string')
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
