<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- Every test category must support user-added custom Tricky questions: they live in the `custom_questions` table and merge into that category's Tricky drill automatically (see `customQuestions` prop on `Quiz` and the `+` button in `TestGrid`). Any new test added to `src/lib/categories.ts` inherits this wiring — keep it intact.
