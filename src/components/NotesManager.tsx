'use client'

import { useState } from 'react'

export type Note = {
  id: number
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export default function NotesManager({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openNew() {
    setEditing('new')
    setTitle('')
    setBody('')
    setError(null)
  }

  function openEdit(note: Note) {
    setEditing(note.id)
    setTitle(note.title)
    setBody(note.body)
    setError(null)
  }

  async function save() {
    if (busy || body.trim() === '') return
    setBusy(true)
    setError(null)
    const isNew = editing === 'new'
    const res = await fetch(isNew ? '/api/notes' : `/api/notes/${editing}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (!res || !res.ok) {
      setError(data.error ?? 'Could not save')
      setBusy(false)
      return
    }
    const note = data.note as Note
    setNotes((prev) => (isNew ? [note, ...prev] : prev.map((n) => (n.id === note.id ? note : n))))
    setEditing(null)
    setBusy(false)
  }

  async function remove(note: Note) {
    if (busy) return
    if (!window.confirm('Delete this note?')) return
    setBusy(true)
    const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
      if (editing === note.id) setEditing(null)
    }
    setBusy(false)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  function renderEditor() {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={120}
          className="w-full rounded-lg border border-strong bg-transparent px-3 py-2 text-sm font-medium outline-none focus:border-ink"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={'Write your tips, tricks and notes…\n\ne.g. Squares ending in 5: n5 × n5 → n(n+1) then append 25'}
          rows={7}
          maxLength={20000}
          className="mt-2 w-full resize-y rounded-lg border border-strong bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
        />
        {error && <p className="mt-1 text-sm text-bad">{error}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy || body.trim() === ''}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-onprimary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg border border-strong px-4 py-1.5 text-sm font-medium transition-colors hover:border-ink"
          >
            Cancel
          </button>
          <span className="ml-auto text-xs text-faint">{body.length}/20000</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {editing === 'new' ? (
        renderEditor()
      ) : (
        <button
          onClick={openNew}
          className="w-full rounded-xl border border-dashed border-strong px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink"
        >
          + New note
        </button>
      )}

      {notes.length === 0 && editing !== 'new' && (
        <p className="py-8 text-center text-sm text-faint">No notes yet — save your first tip or trick above.</p>
      )}

      {notes.map((note) =>
        editing === note.id ? (
          <div key={note.id}>{renderEditor()}</div>
        ) : (
          <article key={note.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {note.title && <h2 className="font-semibold tracking-tight">{note.title}</h2>}
                <p className="text-xs text-faint">{formatDate(note.updatedAt)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => openEdit(note)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-subtle hover:text-ink"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(note)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-bad transition-colors hover:bg-badbg"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
          </article>
        ),
      )}
    </div>
  )
}
