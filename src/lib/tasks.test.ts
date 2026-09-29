import { describe, expect, it } from 'vitest'
import { addTask, deleteTask, editTask, filterTasks, isDueToday, isOverdue, parseTasks, readTasks, saveTasks, sortByDueDate, STORAGE_KEY, type Task } from './tasks'

const now = new Date('2026-04-12T12:00:00.000Z')
const fixture: Task = {
  id: 'one', title: 'Plan week', completed: false, dueDate: '2026-04-15', note: 'Review goals',
  createdAt: now.toISOString(), updatedAt: now.toISOString(),
}

describe('task data handlers', () => {
  it('adds a trimmed task with a unique id and optional data', () => {
    const tasks = addTask([fixture], { title: '  Buy tea  ', dueDate: '2026-04-20', note: '  Earl grey  ' }, now, 'two')
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({ id: 'two', title: 'Buy tea', note: 'Earl grey', completed: false })
  })

  it('requires a title when adding or editing', () => {
    expect(() => addTask([], { title: '  ' }, now, 'empty')).toThrow(/title is required/i)
    expect(() => editTask([fixture], 'one', { title: ' ' }, now)).toThrow(/title is required/i)
  })

  it('edits only the selected task and supports clearing its date and note', () => {
    const tasks = editTask([fixture], 'one', { title: 'Plan trip', dueDate: null, note: '' }, now)
    expect(tasks[0]).toMatchObject({ title: 'Plan trip', dueDate: null, note: '' })
  })

  it('completes and reactivates a task through the edit handler', () => {
    const completed = editTask([fixture], 'one', { completed: true }, now)
    expect(completed[0].completed).toBe(true)
    expect(editTask(completed, 'one', { completed: false }, now)[0].completed).toBe(false)
  })

  it('deletes only the selected task', () => {
    expect(deleteTask([fixture, { ...fixture, id: 'two' }], 'one').map((task) => task.id)).toEqual(['two'])
  })

  it('parses valid localStorage data and upgrades older optional fields', () => {
    const older = { ...fixture, note: undefined, dueDate: undefined }
    expect(parseTasks(JSON.stringify([older]))[0]).toMatchObject({ note: '', dueDate: null })
  })

  it('returns an empty list for malformed or unsafe stored data', () => {
    expect(parseTasks('{oops')).toEqual([])
    expect(parseTasks(JSON.stringify({ title: 'not a list' }))).toEqual([])
    expect(parseTasks(JSON.stringify([{ id: 2, title: 'Broken' }]))).toEqual([])
  })

  it('filters by status and searches task titles without case sensitivity', () => {
    const tasks = [fixture, { ...fixture, id: 'two', title: 'Buy groceries', completed: true }]
    expect(filterTasks(tasks, 'active').map((task) => task.id)).toEqual(['one'])
    expect(filterTasks(tasks, 'completed').map((task) => task.id)).toEqual(['two'])
    expect(filterTasks(tasks, 'all', '  PLAN ')).toEqual([fixture])
    expect(filterTasks(tasks, 'active', 'missing')).toEqual([])
  })

  it('saves to and restores from localStorage-shaped storage after a refresh', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }
    saveTasks([fixture], storage)
    expect(values.has(STORAGE_KEY)).toBe(true)
    expect(readTasks(storage)).toEqual([fixture])
  })

  it('labels today and overdue dates while exempting completed tasks', () => {
    const today = { ...fixture, dueDate: '2026-04-12' }
    const late = { ...fixture, dueDate: '2026-04-11' }
    expect(isDueToday(today, '2026-04-12')).toBe(true)
    expect(isOverdue(late, '2026-04-12')).toBe(true)
    expect(isOverdue({ ...late, completed: true }, '2026-04-12')).toBe(false)
  })

  it('sorts dated tasks earliest-first and leaves undated tasks at the end', () => {
    const noDate = { ...fixture, id: 'none', dueDate: null }
    const later = { ...fixture, id: 'later', dueDate: '2026-04-18' }
    expect(sortByDueDate([noDate, later, fixture]).map((task) => task.id)).toEqual(['one', 'later', 'none'])
  })
})
