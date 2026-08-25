# Provisional Certificate Application Portal

A small full-stack portal where an applicant signs up, files a Provisional Certificate
application in three steps, uploads two supporting PDFs, and downloads a server-generated
acknowledgement they can re-download from a dashboard at any time.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · PostgreSQL · Prisma ORM · pdf-lib**.

---

## Quick start

```bash
# 1. install
npm install

# 2. database — either use the bundled compose file...
docker compose up -d
# ...or point DATABASE_URL at any Postgres 14+ you already run

# 3. configure
cp .env.example .env.local
#   - set DATABASE_URL
#   - set JWT_SECRET (at least 32 chars):
#     node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 4. create the schema (idempotent)
npm run db:migrate

# 5. run
npm run dev        # http://localhost:3000
```

Then open http://localhost:3000, create an account, and file an application.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | `prisma db push` — syncs `prisma/schema.prisma` to the database. Safe to re-run. |
| `npm run db:reset` | `prisma db push --force-reset` — drops and re-applies the schema. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run smoke -- http://localhost:3000` | End-to-end API smoke test (35 assertions). |

---

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string, e.g. `postgresql://pcp:pcp_password@localhost:5432/provisional_certificate` |
| `JWT_SECRET` | yes | — | HMAC key for session JWTs and signed download tokens. Minimum 32 characters. |
| `STORAGE_DIR` | no | `./storage/uploads` | Where uploaded PDFs are written. Deliberately outside `public/`. |
| `SESSION_TTL_SECONDS` | no | `604800` (7 days) | Session lifetime. |
| `MAX_UPLOAD_BYTES` | no | `5242880` (5 MB) | Per-file upload ceiling. |
| `S3_BUCKET_NAME` | no | — | S3 bucket name. If provided with Region, switches storage to S3. |
| `S3_REGION` | no | — | S3 region (e.g. `us-east-1`). |
| `APP_AWS_ACCESS_KEY_ID` | no | — | Standard AWS credentials (renamed to avoid Netlify reserved vars). |
| `APP_AWS_SECRET_ACCESS_KEY` | no | — | Standard AWS credentials (renamed to avoid Netlify reserved vars). |

Nothing reads `process.env` directly; `src/lib/env.ts` is the single, fail-fast accessor.

---

## Architecture

```
src/
├── middleware.ts              Edge JWT check — guards /dashboard, /apply, /applications
├── app/
│   ├── page.tsx               Public landing page
│   ├── login, signup          Auth screens (split layout)
│   ├── (portal)/              Signed-in shell + server-side session guard
│   │   ├── dashboard          Status dashboard (server component)
│   │   ├── apply              3-step wizard (client)
│   │   └── applications/[id]  Application detail
│   └── api/
│       ├── auth/{signup,login,logout,me}
│       ├── uploads            multipart PDF intake
│       ├── applications       list + submit
│       ├── applications/[id]  detail
│       ├── applications/[id]/certificate   PDF stream + retry issue
│       └── files/[id]         private document download (signed token)
├── components/
│   ├── ui/                    shadcn/ui primitives
│   ├── apply/                 wizard: stepper, steps, upload field, success panel
│   ├── dashboard/, layout/, auth/
└── lib/
    ├── env.ts                 fail-fast env access
    ├── db/                    Prisma client (pg driver adapter)
    ├── repositories/          users, applications, documents (all Prisma queries live here)
    ├── auth/                  bcrypt hashing, jose JWTs, session cookie
    ├── api/                   error types + centralised route wrapper
    ├── validation/            Zod schemas shared by client and server
    ├── storage/               ObjectStore interface + local-disk and S3 drivers
    ├── pdf/certificate.ts     server-side PDF generation
    └── dto.ts                 row → API shape mapping
prisma/schema.prisma            the entire schema, source of truth
scripts/                       smoke test
```

### Request flow for a submission

1. `POST /api/uploads` — twice, once per document. Each file is checked for MIME type,
   extension, size **and** `%PDF-` magic bytes, hashed (SHA-256), written to
   `STORAGE_DIR/users/<userId>/<documentId>.pdf` with mode `0600`, and recorded as a
   *staged* row (`documents.application_id IS NULL`).
2. `POST /api/applications` — the body is validated with the same Zod schema the browser
   used. Inside one transaction: insert the application, then attach both staged documents.
   If either attach fails, the whole thing rolls back.
3. The acknowledgement is issued: a serial is drawn from the `certificate_serials`
   auto-increment table and the row flips to `COMPLETED`.
4. `GET /api/applications/:id/certificate` renders the PDF with pdf-lib on demand.

---

## API reference

All responses are enveloped: `{ "data": … }` on success, `{ "error": { code, message, details? } }` on failure.
Authentication is a JWT — sent as an httpOnly cookie by the browser, or as
`Authorization: Bearer <token>` from any other client.

| Method | Path | Success | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | `201` | `409` if the email exists, `400` on weak password |
| `POST` | `/api/auth/login` | `200` | `401` with an identical message for bad email *or* password |
| `POST` | `/api/auth/logout` | `200` | Clears the cookie |
| `GET` | `/api/auth/me` | `200` | Current session + application counts |
| `POST` | `/api/uploads` | `201` | `413` too large, `415` not a PDF, `400` no file |
| `GET` | `/api/applications` | `200` | Caller's applications, newest first |
| `POST` | `/api/applications` | `201` | `400` validation, `409` duplicate registration number |
| `GET` | `/api/applications/:id` | `200` | `404` for someone else's id (never `403`, so ids stay unenumerable) |
| `GET` | `/api/applications/:id/certificate` | `200` | `application/pdf`; add `?inline=1` to view instead of download |
| `POST` | `/api/applications/:id/certificate` | `200` | Idempotent retry of certificate issuing |
| `GET` | `/api/files/:id?token=…` | `200` | `403` invalid/expired token, `404` not the owner's document |

---

## Security notes

- **Passwords** — bcrypt, cost 12. A login attempt for an unknown email still performs a
  bcrypt comparison so the response time does not reveal whether the account exists.
- **Sessions** — HS256 JWT (jose) in an httpOnly, SameSite=Lax cookie, `secure` in
  production. The same verification runs at the edge in `middleware.ts` and in every
  protected route handler.
- **Documents** — stored outside `public/`, so there is no static URL to guess. The only
  way out is `/api/files/:id`, which requires either the owner's session or a signed
  five-minute token scoped to that one document. Every query is scoped by `user_id`.
- **Uploads** — type, extension, size and magic bytes are all validated server-side;
  filenames are stripped of path separators and control characters.
- **SQL** — all queries go through Prisma's parameterised query builder; every query lives in
  `src/lib/repositories`.
- **Secrets** — nothing hardcoded; `.env.local` is gitignored and `env.ts` refuses to boot
  with a missing or too-short `JWT_SECRET`.

---

## Deployment

The app is a standard Next.js 15 server app plus a PostgreSQL database.

1. Provision Postgres (Railway, Neon, RDS, Supabase…) and set `DATABASE_URL`
   (append `?sslmode=require` for a managed instance).
2. Run `npm run db:migrate` once against it.
3. Deploy the app (Railway, Render, Fly.io, a VM, or Vercel/Netlify) with `DATABASE_URL`,
   `JWT_SECRET`.
   If you deploy on a serverless platform (like Vercel or Netlify) where local disk is ephemeral,
   you must configure S3 storage. Provide `S3_BUCKET_NAME`, `S3_REGION`, `APP_AWS_ACCESS_KEY_ID`, 
   and `APP_AWS_SECRET_ACCESS_KEY` environment variables. The application will automatically 
   detect these and switch from local disk storage to S3 object storage seamlessly. No route or component changes are needed.

---

## Testing

`scripts/smoke.mjs` walks the whole journey against a running server — signup and the
duplicate/weak-password paths, route protection, the three upload rejection paths, both
successful uploads, signed and tampered download links, submit and its validation and
conflict paths, the PDF bytes, the dashboard listing, and cross-account isolation
(a second account gets `404` for the first one's application and document).

```bash
npm run build && npm start &
npm run smoke -- http://localhost:3000
# → 35 passed, 0 failed
```

See `WRITEUP.md` for the schema rationale, trade-offs and what would come next.
