import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config()
dotenv.config({ path: '.env.local' })

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and add your Postgres/Neon URL.')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
})
