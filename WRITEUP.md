# Write-up

## Stack choices

**Next.js 15 + TypeScript** for frontend and backend in one deployable. Route handlers give
a real REST surface, while server components let the dashboard read from the database
directly instead of making the server call its own HTTP endpoint.

**PostgreSQL with Prisma** (via the `@prisma/adapter-pg` driver adapter over `pg`). The data
is unambiguously relational: users own applications, applications own documents, and both
relationships want foreign keys and cascade deletes. Postgres and Prisma were chosen over
the initial hand-rolled MySQL layer for a boring reason — a generated, typed client removes
a whole class of row-shape bugs at the repository boundary for a fraction of the code, and
`prisma/schema.prisma` is now the single readable source of truth for the schema (previously
`db/schema.sql`, hand-maintained). The repository layer (`src/lib/repositories/*`) still
owns every query so call sites stay boring and every access is scoped by `user_id`, and
`src/lib/dto.ts` maps Prisma rows to the API's DTO shape. `UNIQUE (application_id, doc_type)`
carried over unchanged: both Postgres and MySQL treat multiple `NULL`s as distinct in a
plain unique constraint, so "at most one ID proof and one degree certificate per filed
application, but any number of staged (unfiled) uploads" needed no partial index in either.

**pdf-lib** for the acknowledgement. Puppeteer would have let me reuse CSS, but it means
shipping a headless Chromium, ~300 MB of image and a second of cold start per render.
pdf-lib is pure JS, renders in tens of milliseconds, and produces byte-identical output
regardless of the host's font or browser version — which matters for a document that is
meant to be an official record. The trade-off is manual layout; the drawing helpers in
`src/lib/pdf/certificate.ts` absorb that.

**jose** rather than `jsonwebtoken`, because the same verification code then runs in
`middleware.ts` on the Edge runtime and in Node route handlers.

## Why the schema looks like this

**Applicant details are snapshotted onto `applications`, not joined from `users`.** An
issued acknowledgement has to keep saying what was submitted. If the applicant later
corrects their name on their account, the certificate already printed must not silently
change, so the application row carries its own copy of name, DOB, address and so on.

**Documents are staged before the application exists.** Uploads happen at step 2, but the
application row is only created at step 3. So `documents.application_id` is nullable:
`NULL` means "uploaded, not yet filed". Submitting attaches both documents inside the same
transaction that inserts the application, and if either attach fails — already used,
missing, someone else's — the whole transaction rolls back rather than leaving a half-built
application. It also means an abandoned wizard leaves collectable orphans rather than
corrupt data.

**`documents.user_id` is denormalised.** It could be derived through `application_id`, but
staged documents have no application yet, and every read wants to be scoped by owner. With
`user_id` on the row, every document query is `WHERE id = ? AND user_id = ?` — the isolation
guarantee is one predicate, not a join that a future refactor could drop.

**A NULL-distinct unique constraint does real work here.**
`UNIQUE (application_id, doc_type)` enforces "at most one ID proof and one degree
certificate per application" while still allowing any number of staged rows, because
Postgres (like MySQL) treats NULLs as distinct in a unique key — no partial index needed.

**Reference numbers and serials are deliberately different things.** The public reference
(`PC-2026-7QK4XM2B9F`) is random — 10 characters from a 32-symbol alphabet with the
ambiguous letters removed, so it can be read out over a phone but not incremented to guess
someone else's. The internal certificate serial (`PC/CERT/2026/001042`) is gap-free and
comes from an auto-incrementing counter table, because that is what a register wants.
Uniqueness of both is enforced by the database, not by application logic.

**A CHECK constraint ties status to issuance:** a row cannot be `COMPLETED` without both a
serial and an issued-at timestamp. Invariants that matter belong in the schema.

## Trade-offs made for the time box

- **Local disk by default, S3 as a drop-in.** Storage sits behind an `ObjectStore`
  interface (`src/lib/storage/`); a local driver is the default for zero-setup development,
  and an S3 driver (`src/lib/storage/s3.ts`) activates automatically once `S3_BUCKET_NAME`
  and `S3_REGION` are set — required on any serverless host where local disk is ephemeral.
  Both preserve the same property: files are private and reachable only through a
  five-minute signed token / pre-signed URL, never a public bucket or a static path.
- **No email delivery, no reviewer workflow, no payment step** — explicitly out of scope.
- **`status` only moves `SUBMITTED → COMPLETED`**, and in the happy path that happens
  within the submit request. The two states exist because the certificate can fail to issue
  independently of the submission succeeding, and the dashboard then has a retry path
  (`POST /api/applications/:id/certificate`, idempotent).
- **The PDF is rendered on demand, never cached.** At ~50 ms it is cheaper than the
  invalidation logic a cache would need, and it can never drift from the row.
- **Draft persistence uses `sessionStorage`, not a server-side draft table.** One RHF form
  instance backs all three steps — no step is ever unmounted, so going back and forward is
  lossless — and the mirror to `sessionStorage` covers an accidental reload. Uploaded
  documents survive because they are already on the server and referenced by id.
  *Known gap:* after a mid-wizard reload, every field is restored except the optional
  gender select, which comes back empty. Harmless (the field is optional and the schema
  accepts an empty value) but it is a real rough edge; the fix is to seed
  `defaultValues` from storage on the first render instead of resetting in an effect.
- **Tests are one end-to-end smoke script (35 assertions), not unit tests.** For a portal
  whose risk is concentrated in the request path — auth, upload validation, transactional
  submit, tenant isolation — exercising the real server against the real database found
  more than isolated unit tests would have in the same time.

## What I would do next, with more time

1. **Direct-to-S3 uploads** via pre-signed PUT URLs, so a file never transits the app
   server, plus a lifecycle rule for staged documents that were never filed.
2. **A background job** to sweep abandoned staged uploads and their files.
3. **Rate limiting** on `/api/auth/*` and `/api/uploads`, plus a CSRF double-submit token
   for cookie-authenticated mutations.
4. **Real tests**: Vitest around the repositories and the reference generator, and a
   Playwright run of the wizard including the back/forward and reload paths.
5. **Virus scanning** (ClamAV or a managed scanner) between upload and attach — an
   applicant-facing PDF intake should never be trusted.
6. **Observability**: structured request logs with a request id, and an error tracker; the
   centralised handler in `src/lib/api/handler.ts` is already the one place to add both.
7. **Accessibility pass with a real screen reader.** Labels, `aria-invalid`, focus movement
   on validation failure and keyboard-reachable uploads are in place, but I have not tested
   with assistive technology.
8. **A reviewer role** — the `status` enum and the snapshot-on-submit design were chosen so
   that an approval workflow can be added without migrating existing rows.
