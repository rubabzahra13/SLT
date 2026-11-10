# Egress & Fluid CPU — Coding Guide for Future Projects

Practical rules for writing APIs and client code that stay cheap and fast on **Vercel Fluid Compute** and **Supabase** (or any Postgres/PostgREST stack with egress billing).

Use this as a checklist when designing reads, writes, bulk ops, and deletes.

---

## 1. What you are optimizing

### Supabase egress

Egress = bytes **leaving** Supabase toward a client (browser, Vercel function, pooler consumer, etc.).

It includes:

| Source | What counts |
| --- | --- |
| Database / PostgREST | Rows returned to the caller |
| Shared pooler (Supavisor) | Query result bytes to your backend |
| Auth / Realtime / Storage / Edge Functions | Tokens, events, files, responses |
| Log drains | Log payload bytes (enable GZIP if supported) |

**Key facts**

- Charged per GB over plan quota; cached Storage CDN egress is a separate (cheaper) meter.
- Already-served bytes cannot be undone — optimizations only cut *future* usage.
- Pulling 1 MB from the DB into a function, then sending 100 KB to the user, still pays **DB→function + function→user**.

**Debug**

- Dashboard → Advisors → Query performance (frequent queries + avg rows).
- Logs / API Gateway “top paths” for chatty endpoints.

### Vercel Fluid Compute

Fluid is **not** classic one-request-per-microVM serverless:

- Multiple invocations can share one instance (**in-function concurrency**).
- **Active CPU** billing pauses while the function waits on I/O (DB, HTTP, Gmail, etc.).
- Prefer filling idle capacity on an existing instance before scaling out.
- `waitUntil` is for short post-response work (logging, cache warm) — not long jobs.
- Long / multi-step / retryable work → Queues or Workflows; make consumers **idempotent**.
- **Never** put request-specific secrets or user state in module-level globals (shared process).

**Implication:** waiting on the DB is cheap on CPU. **Wasted bytes and N round-trips** are still expensive on egress and latency.

---

## 2. Core principles

1. **Return less** — select only columns you need; never `SELECT *` / full ORM entities for list or delete paths.
2. **Call less** — one bulk endpoint beats N single-row calls.
3. **Don’t echo writes** — mutations should return `204` or a tiny summary (`{ deleted, missing }`), not the full row, unless the UI truly needs it.
4. **Batch with limits** — chunk IDs (e.g. 50–100) to avoid huge URL/`IN` lists, long locks, and WAL spikes.
5. **Cache on the client** — optimistic UI + board/list caches so deletes/edits don’t refetch entire boards.
6. **Idempotent deletes** — “already gone” is success (`allow_missing` / `missing` count), not a hard error.
7. **I/O-bound handlers** — keep Fluid functions waiting on DB/network, not doing heavy CPU transforms inline.
8. **Safe shared process** — connection pools OK at module scope; per-request data is not.

---

## 3. Patterns to copy

### Lean list / board reads

```text
❌ GET /items → full rows for every column + nested relations
✅ GET /items/board → only columns the table paints; paginate; counts via a separate lean endpoint
```

- Prefer cursor pagination over dumping unbounded lists.
- Debounce search; don’t hit the API on every keystroke.
- Warm counts/badges with a counts-only call, not a full board refetch.

### Lean mutations

```text
❌ PATCH /items/:id → returns entire updated row + joins
✅ PATCH /items/:id → 204, or { id, updatedAt } only
```

Configure ORMs / PostgREST so updates/inserts **do not** return the row when unused (`returning=minimal` / omit `.select()`).

### Bulk delete / bulk action (preferred shape)

**One request, set-based SQL, counts-only response.**

```http
POST /api/resource/bulk-delete
Content-Type: application/json

{ "ids": ["…", "…"] }   // cap ~100 per request; client chunks if larger
```

```json
{ "deleted": 17, "missing": 2 }
```

Server sketch:

1. Parse / dedupe UUIDs; reject oversized payloads.
2. `SELECT id, foreign_key` only — **no** `selectinload` of full graphs.
3. `DELETE … WHERE id IN (…)`, cascade related rows with set-based deletes (`synchronize_session=False` in SQLAlchemy).
4. Single `commit` per chunk.
5. Invalidate caches; do **not** publish giant payloads on the event bus.
6. Treat missing IDs as `missing`, not 404 for the whole batch.

Client sketch:

1. Snapshot selected IDs when opening the confirm modal.
2. Optimistically drop rows from local/board caches.
3. `POST` chunks sequentially (Fluid Active CPU can idle between awaits).
4. On failure, restore optimistic state and/or reload the board.
5. Confirm UI before any destructive call.

### Single delete

Reuse the same lean delete helper as bulk (same SQL path). Prefer `204` + `?allow_missing=true` for idempotent UI retries.

### Avoid URL-length traps

PostgREST `.in('id', hugeList)` can blow URL limits. Prefer:

- **POST body** with an ID array (as above), or
- Chunked requests with a hard max length.

### Storage

- Delete via Storage API (not raw SQL) so objects aren’t orphaned.
- Cap batch removes (API limits apply; large empties may need S3 sync).
- Prefer Smart CDN / image transforms so repeated views hit **cached** egress.

---

## 4. When to use what on Vercel

| Work | Use |
| --- | --- |
| Request/response + short DB/API wait | Fluid Function (default) |
| Tiny work after responding | `waitUntil` |
| Many independent jobs, retries | Queues (idempotent consumers) |
| Multi-step, sleep, resume | Workflows |
| Always-on / heavy CPU workers | Daemons / external workers — not request path |

Do **not** add a queue “to avoid idle billing” for simple I/O — Fluid already pauses Active CPU while waiting. Queue for **durability and retries**, not for that old idle-cost reason.

---

## 5. Code review checklist

Before merging a data-heavy feature:

- [ ] List endpoints select only UI columns
- [ ] Mutations don’t return full rows unless required
- [ ] Bulk ops use one (or few chunked) requests, not loops of singles
- [ ] Bulk body size capped; deletes are set-based and chunked
- [ ] Responses are counts/ids, not re-serialized entities
- [ ] Client caches updated optimistically; no full-board refetch on every click
- [ ] Destructive actions require an explicit confirm modal
- [ ] Handlers are idempotent for retries / double-clicks
- [ ] No per-request state in module globals
- [ ] Heavy CPU / long jobs not stuck on the interactive request path

---

## 6. Anti-patterns

| Don’t | Do instead |
| --- | --- |
| `for (id of ids) await delete(id)` | `POST /bulk-delete` with chunked IDs |
| `DELETE` then `SELECT *` to “confirm” | Return `{ deleted }` / `204` |
| Refetch entire board after one delete | Patch local cache / remove keys |
| Load relations for a delete path | Query `id` (+ FKs) only |
| Stream full DB dumps through the pooler for backups | Narrow tables; lower frequency; prefer native backup tools |
| Store user/session data in global module vars on Fluid | Request-scoped only; share only safe pools |

---

## 7. Reference (research sources)

- [Vercel Fluid compute](https://vercel.com/docs/fluid-compute)
- [Running background workers on Vercel](https://vercel.com/kb/guide/background-workers-on-vercel)
- [Supabase: Manage Egress usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Supabase: All about Egress](https://supabase.com/kb/troubleshooting/all-about-supabase-egress-a_Sg_e)
- [Supabase: Data deletion (batch deletes)](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/data-deletion.mdx)

---

## 8. Example applied in this repo

Payroll Archive bulk delete:

- `POST /api/mtd/bulk-delete` with `{ ids }` (max 100)
- Server selects only `id` / `order_id`, set-deletes addons → MTD → orders
- Response: `{ deleted, missing }` only
- Client: Gmail-style checkboxes → confirm modal → optimistic cache drop → chunked API

Follow that shape for future bulk archive / purge / mark-paid / export jobs.
