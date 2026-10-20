import { desc, eq } from 'drizzle-orm'
import NotesManager from '@/components/NotesManager'
import { getDb } from '@/db'
import { notes as notesTable } from '@/db/schema'
import { requireSession } from '@/lib/auth'

export default async function NotesPage() {
  const session = await requireSession()
  const rows = await getDb()
    .then((db) =>
      db.select().from(notesTable).where(eq(notesTable.userId, session.userId)).orderBy(desc(notesTable.updatedAt)),
    )
    .catch((err) => {
      console.error('Notes query failed — run npm run db:push', err)
      return [] as (typeof notesTable.$inferSelect)[]
    })

  const initialNotes = rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-0.5 text-sm text-muted">Your personal tips, tricks and reminders — saved to your account</p>
      </div>
      <NotesManager initialNotes={initialNotes} />
    </div>
  )
}
