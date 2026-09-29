import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp, CalendarDays, Check, CheckCheck, ChevronDown, Circle, ClipboardList,
  Download, FileText, ListTodo, Pencil, Plus, Search, StickyNote,
  Trash2, Upload, X,
} from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import {
  addTask, deleteTask, editTask, filterTasks, isDueToday, isOverdue, localDateKey, parseTasks,
  readTasks, saveTasks, sortByDueDate, type Task,
} from './lib/tasks'

type Tab = 'todo' | 'notes'
type Filter = 'all' | 'active' | 'completed'
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => readTasks())
  const [tab, setTab] = useState<Tab>('todo')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [sortDue, setSortDue] = useState(false)
  const [editor, setEditor] = useState<Task | 'new' | null>(null)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { saveTasks(tasks) } catch { setNotice('Your browser could not save changes. Check available storage.') }
  }, [tasks])

  const activeCount = tasks.filter((task) => !task.completed).length
  const doneCount = tasks.length - activeCount
  const notedCount = tasks.filter((task) => task.note.trim()).length
  const visibleTasks = useMemo(() => {
    const list = filterTasks(tasks, filter, query)
    return sortDue ? sortByDueDate(list) : list
  }, [tasks, filter, query, sortDue])

  function persistAction(action: (previous: Task[]) => Task[]) {
    setTasks(action)
  }
  function toggleTask(task: Task) {
    persistAction((previous) => editTask(previous, task.id, { completed: !task.completed }))
  }
  function removeTask(task: Task) {
    if (window.confirm(`Delete “${task.title}” and its note permanently?`)) {
      persistAction((previous) => deleteTask(previous, task.id))
    }
  }
  function saveEditor(input: { title: string; dueDate: string | null; note: string }) {
    if (editor === 'new') persistAction((previous) => addTask(previous, input))
    else if (editor) persistAction((previous) => editTask(previous, editor.id, input))
    setEditor(null)
  }
  function exportBackup() {
    const blob = new Blob([JSON.stringify({ app: 'TaskFlow', version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `taskflow-backup-${localDateKey(new Date())}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Backup downloaded.')
  }
  async function importBackup(file?: File) {
    if (!file) return
    try {
      const content = await file.text()
      let data: unknown = JSON.parse(content)
      if (!Array.isArray(data) && data && typeof data === 'object' && 'tasks' in data) data = (data as { tasks: unknown }).tasks
      if (!Array.isArray(data)) throw new Error('Choose a TaskFlow JSON backup containing a task list.')
      const imported = parseTasks(JSON.stringify(data))
      if (data.length && !imported.length) throw new Error('This backup does not contain valid TaskFlow tasks.')
      const replace = window.confirm(`Replace your current list with ${imported.length} task${imported.length === 1 ? '' : 's'} from this backup? Choose Cancel to add the backup tasks alongside your current list.`)
      persistAction(() => replace ? imported : mergeTasks(tasks, imported))
      setNotice(replace ? 'Backup restored.' : 'Backup tasks added to your list.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not read that backup file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#home" aria-label="TaskFlow home">
        <span className="brand-mark"><CheckCheck size={19} strokeWidth={2.6} /></span>
        <span>task<span className="brand-accent">flow</span></span>
      </a>
      <div className="topbar-right"><span className="local-badge"><span className="status-dot" />Saved on this device</span><button className="avatar" aria-label="Personal workspace">Y</button></div>
    </header>

    <main className="page-wrap">
      <section className="welcome-row">
        <div><div className="eyebrow">YOUR PERSONAL WORKSPACE</div><h1>A little more <span>flow.</span></h1><p className="subtitle">Make room for what matters, one task at a time.</p></div>
        <div className="date-chip"><CalendarDays size={16} /><span>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span></div>
      </section>

      <section className="summary-grid" aria-label="Task summary">
        <SummaryCard icon={<ListTodo size={17} />} label="On your list" value={String(tasks.length).padStart(2, '0')} hint="all tasks" tone="mint" />
        <SummaryCard icon={<Circle size={16} />} label="In progress" value={String(activeCount).padStart(2, '0')} hint="still to do" tone="yellow" />
        <SummaryCard icon={<Check size={18} />} label="All done" value={String(doneCount).padStart(2, '0')} hint="nicely done" tone="lavender" />
        <SummaryCard icon={<StickyNote size={17} />} label="With notes" value={String(notedCount).padStart(2, '0')} hint="little reminders" tone="peach" />
      </section>

      <section className="workspace-card">
        <div className="workspace-head">
          <div className="tabs" role="tablist" aria-label="Task views">
            <button className={`tab ${tab === 'todo' ? 'selected' : ''}`} role="tab" aria-selected={tab === 'todo'} onClick={() => setTab('todo')}><ListTodo size={16} />To-do <span className="tab-count">{tasks.length}</span></button>
            <button className={`tab ${tab === 'notes' ? 'selected' : ''}`} role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}><StickyNote size={16} />Notes <span className="tab-count">{notedCount}</span></button>
          </div>
          <div className="backup-actions">
            <button className="quiet-button" onClick={exportBackup} title="Download a JSON backup"><Download size={15} /><span>Export</span></button>
            <button className="quiet-button" onClick={() => fileRef.current?.click()} title="Restore from a JSON backup"><Upload size={15} /><span>Import</span></button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Choose TaskFlow JSON backup" onChange={(event) => void importBackup(event.target.files?.[0])} />
          </div>
        </div>

        {tab === 'todo' ? <>
          <div className="list-heading"><div><h2>Your tasks</h2><p>A clear list makes for a clear mind.</p></div><button className="primary-button" onClick={() => setEditor('new')}><Plus size={17} strokeWidth={2.5} />Add task</button></div>
          <div className="list-tools">
            <div className="filter-pills" role="group" aria-label="Filter tasks">
              {(['all', 'active', 'completed'] as Filter[]).map((item) => <button key={item} className={`filter-pill ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item === 'active' ? 'Active' : 'Completed'} <span>{item === 'all' ? tasks.length : item === 'active' ? activeCount : doneCount}</span></button>)}
            </div>
            <div className="tools-right"><label className="search-box"><Search size={16} /><input aria-label="Search tasks by title" placeholder="Find a task..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Clear search" className="clear-search" onClick={() => setQuery('')}><X size={14} /></button>}</label><button className={`sort-button ${sortDue ? 'sort-active' : ''}`} onClick={() => setSortDue((value) => !value)} aria-pressed={sortDue} title="Sort by due date"><ArrowDownUp size={15} /><span>Due date</span><ChevronDown size={13} /></button></div>
          </div>
          <div className="task-list" aria-live="polite">
            {visibleTasks.length ? visibleTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task)} onEdit={() => setEditor(task)} onDelete={() => removeTask(task)} onNote={() => setEditor(task)} />) : <EmptyState type={tasks.length === 0 ? 'tasks' : query || filter === 'all' ? 'search' : filter} onAdd={() => setEditor('new')} onReset={() => { setQuery(''); setFilter('all') }} />}
          </div>
          <div className="list-footer"><span>Showing <b>{visibleTasks.length}</b> of <b>{tasks.length}</b> tasks</span><span className="privacy-note"><span className="tiny-lock">●</span> Your tasks stay on this device</span></div>
        </> : <>
          <div className="list-heading notes-heading"><div><h2>Your notes</h2><p>The details and little things worth remembering.</p></div></div>
          <div className="notes-list" aria-live="polite">
            {tasks.filter((task) => task.note.trim()).length ? tasks.filter((task) => task.note.trim()).map((task) => <article className="note-card" key={task.id}><div className="note-card-top"><div className="note-title-wrap"><span className={`note-task-dot ${task.completed ? 'done' : ''}`} /> <h3 className={task.completed ? 'completed-title' : ''}>{task.title}</h3></div><button className="icon-button" aria-label={`Edit ${task.title} and its note`} onClick={() => setEditor(task)}><Pencil size={15} /></button></div><p className="note-copy">{task.note}</p><button className="note-open" onClick={() => setEditor(task)}><FileText size={14} /> Open task <ChevronDown size={13} className="open-arrow" /></button></article>) : <EmptyState type="notes" onAdd={() => { setTab('todo'); setEditor('new') }} />}
          </div>
          <div className="list-footer"><span><b>{notedCount}</b> {notedCount === 1 ? 'note' : 'notes'} attached to your tasks</span><span className="privacy-note"><span className="tiny-lock">●</span> Your notes stay on this device</span></div>
        </>}
      </section>
      <footer className="page-footer"><span>TaskFlow <span className="footer-dot">✳</span> a calmer way to get things done</span><button className="footer-link" onClick={() => setNotice('TaskFlow saves your tasks and notes in this browser using local storage. They do not sync across devices.')}>About local storage</button></footer>
      {notice && <div className="toast" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={15} /></button></div>}
    </main>
    {editor && <TaskEditor task={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSave={saveEditor} />}
    <Analytics />
  </div>
}

function mergeTasks(current: Task[], imported: Task[]): Task[] {
  const existing = new Set(current.map((task) => task.id))
  const normalized = imported.map((task) => existing.has(task.id) ? { ...task, id: `${task.id}-import-${Math.random().toString(36).slice(2, 7)}` } : task)
  return [...normalized, ...current]
}

function SummaryCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) {
  return <article className="summary-card"><div className={`summary-icon ${tone}`}>{icon}</div><div className="summary-info"><span className="summary-label">{label}</span><div className="summary-bottom"><strong>{value}</strong><span>{hint}</span></div></div></article>
}

function TaskRow({ task, onToggle, onEdit, onDelete, onNote }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void; onNote: () => void }) {
  const overdue = isOverdue(task)
  const today = isDueToday(task)
  return <article className={`task-row ${task.completed ? 'is-complete' : ''}`}>
    <button className={`task-check ${task.completed ? 'checked' : ''}`} aria-label={task.completed ? `Mark ${task.title} active` : `Complete ${task.title}`} onClick={onToggle}>{task.completed && <Check size={13} strokeWidth={3} />}</button>
    <div className="task-main"><button className={`task-title ${task.completed ? 'strike' : ''}`} onClick={onEdit}>{task.title}</button><div className="task-meta">
      {task.dueDate ? <span className={`due-label ${overdue ? 'overdue' : today ? 'due-today' : ''}`}><CalendarDays size={13} />{overdue ? 'Overdue · ' : today ? 'Due today · ' : ''}{dateFormat.format(new Date(`${task.dueDate}T00:00:00Z`))}</span> : <button className="meta-add" onClick={onEdit}><Plus size={12} />Add due date</button>}
      {task.note.trim() ? <button className="note-indicator" onClick={onNote}><StickyNote size={13} />Note</button> : <button className="meta-add" onClick={onNote}><Plus size={12} />Add note</button>}
    </div></div>
    <div className="row-actions"><button className="icon-button" aria-label={`Edit ${task.title}`} onClick={onEdit}><Pencil size={15} /></button><button className="icon-button delete-action" aria-label={`Delete ${task.title}`} onClick={onDelete}><Trash2 size={15} /></button></div>
  </article>
}

function EmptyState({ type, onAdd, onReset }: { type: 'tasks' | 'search' | 'active' | 'completed' | 'notes'; onAdd: () => void; onReset?: () => void }) {
  const content = {
    tasks: ['A fresh start', 'Your list is clear. Add a task and take it one step at a time.'],
    search: ['No matches just yet', 'Try another search, or clear it to see your whole list.'],
    active: ['All caught up', 'There are no active tasks. Take a moment to enjoy that.'],
    completed: ['Nothing checked off yet', 'Finished tasks will find a home here.'],
    notes: ['Nothing to note yet', 'Add a note to any task and it will show up here.'],
  }[type]
  return <div className="empty-state"><div className="empty-illustration"><ClipboardList size={27} strokeWidth={1.5} /><span>✳</span></div><h3>{content[0]}</h3><p>{content[1]}</p>{type === 'tasks' || type === 'notes' ? <button className="empty-action" onClick={onAdd}><Plus size={15} />{type === 'tasks' ? 'Add your first task' : 'Create a task'}</button> : onReset && <button className="empty-action subtle-action" onClick={onReset}>Show all tasks</button>}</div>
}

function TaskEditor({ task, onClose, onSave }: { task: Task | null; onClose: () => void; onSave: (input: { title: string; dueDate: string | null; note: string }) => void }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [note, setNote] = useState(task?.note ?? '')
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { titleRef.current?.focus() }, [])
  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('Give your task a title to get started.'); titleRef.current?.focus(); return }
    onSave({ title, dueDate: dueDate || null, note })
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
    <div className="modal-head"><div><span className="modal-kicker">{task ? 'MAKE IT JUST RIGHT' : 'ONE THING AT A TIME'}</span><h2 id="editor-title">{task ? 'Edit task' : 'A new task'}</h2></div><button className="icon-button close-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div>
    <form onSubmit={submit}><label className="field-label" htmlFor="task-title">Task title <span>Required</span></label><input ref={titleRef} id="task-title" className="text-field" value={title} onChange={(event) => { setTitle(event.target.value); setError('') }} placeholder="What needs to get done?" maxLength={140} />{error && <span className="field-error" role="alert">{error}</span>}
      <label className="field-label date-field-label" htmlFor="task-date">Due date <span>Optional</span></label><div className="date-input-wrap"><CalendarDays size={16} /><input id="task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><button type="button" className="date-clear" onClick={() => setDueDate('')} disabled={!dueDate}>Clear</button></div>
      <label className="field-label note-field-label" htmlFor="task-note">A little note <span>Optional</span></label><textarea id="task-note" className="text-field note-field" rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a detail, reminder, or anything helpful..." maxLength={2000} />
      <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button save-button">{task ? 'Save changes' : <><Plus size={16} />Add to my list</>}</button></div>
    </form>
  </section></div>
}
