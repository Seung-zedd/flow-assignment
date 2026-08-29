# Secret Management — Zero-Trust (Vercel / Neon)

Adopted from cubrain `skills/AGENTS.md` §28 (Zero-Trust Secret Management, written after the April 2026 Vercel supply-chain incident) and cross-checked against the Vercel CLI reference (`vercel env`, updated 2026-08-20). Binds every agent and the orchestrator in this project. Mechanical enforcement: `.claude/hooks/guards/block-vercel-env-insecure.mjs` (PreToolUse on Bash) + `block-env-edit.mjs` (PreToolUse on Edit/Write).

## 1. No secrets to the AI

- Never request, read, echo, or store a real `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, Vercel token, or any production credential. `.env`, `.env.local`, `.env.production` are deny-listed for Read/Edit/Write; only `.env.example` (names, empty values) is editable.
- If a real secret appears in the conversation, say so and recommend rotation immediately; do not use it.
- Application code reads secrets only through `$env/dynamic/private`; `process.env` is allowed only in `scripts/` that run outside SvelteKit.

## 2. Blind CLI updates — the value never enters a command string

- Adding or updating a Vercel variable is done by the **user** at the interactive prompt: `vercel env add NAME production` (paste the value when asked) or `vercel env add NAME production < file`. Guides written for the user MUST use that form.
- Forbidden (hook-enforced): `echo VALUE | vercel env add …`, `vercel env add NAME --value VALUE`, a fourth positional argument, `--no-sensitive`, and `vercel env pull` from an AI session. Shell history and the session transcript would otherwise hold the plaintext.

## 3. Every Vercel variable is Sensitive

- Production and Preview: the CLI default is `sensitive`; never pass `--no-sensitive`. Sensitive values cannot be read back from the dashboard, `vercel env ls`, or the API — that is the point.
- The Development target cannot be sensitive (the API rejects it), so local development values live in the developer's untracked `.env`, typed by hand. Do not create Development-scoped variables on Vercel for secrets.
- Before any deploy, confirm with the user that `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` exist on the Vercel project as Sensitive. The evidence is the dashboard's "Sensitive" badge reported by the user — never a value read by the AI.

## 4. Git safety

- `.env` and `.env.*` (except `.env.example`) stay in `.gitignore`; a missing entry is fixed before any other work.
- Never commit `.vercel/` (project link + pulled env).

## 5. Where this shows up in deliverables

- `README.md` deploy section: interactive `vercel env add` steps, "mark as Sensitive" note, local `.env` for development.
- `CONSIDERATIONS.md` item E5 (secret handling): cite this rule and the incident rationale.
