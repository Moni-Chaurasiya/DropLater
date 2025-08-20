# DropLater

A tiny scheduling & delivery system: create notes now, deliver to a webhook at/after a time. Exactly-once delivery via idempotency. Retries with backoff. Minimal React admin (static).

## Services
- **api**: REST endpoints + serves admin UI
- **worker**: polls due notes, enqueues & delivers with retries
- **sink**: webhook receiver, idempotency via Redis SET NX EX
- **mongo**, **redis**: datastores

## Quick start
1. Copy `.env.example` to `.env` and adjust values.

2. Build & run everything:
```bash
docker compose up --build
```

3. Health checks:
- API: `GET http://localhost:3000/health` → `{ ok: true }`
- Sink: `GET http://localhost:4000/health` → `{ ok: true }`

4. Open admin UI: http://localhost:3000 (enter ADMIN_TOKEN when prompted).

5. Create a note with a **past** `releaseAt` (e.g., `2020-01-01T00:00:10.000Z`) and webhook `http://localhost:4000/sink`.

6. Within ~5s the worker should deliver it. Check container logs.

### Example curl
```bash
export ADMIN_TOKEN=supersecret_admin

# Create
curl -X POST http://localhost:3000/api/notes  -H "Authorization: Bearer $ADMIN_TOKEN"  -H "Content-Type: application/json"  -d '{
  "title":"Hello",
  "body":"Ship me later",
  "releaseAt":"2020-01-01T00:00:10.000Z",
  "webhookUrl":"http://localhost:4000/sink"
 }'

# List
curl -H "Authorization: Bearer $ADMIN_TOKEN"  "http://localhost:3000/api/notes?status=pending&page=1"

# Replay
curl -X POST  -H "Authorization: Bearer $ADMIN_TOKEN"  "http://localhost:3000/api/notes/<id>/replay"
```

## Tests
Mongo & Redis must be running (via compose). Then:

```bash
cd worker
npm install
npm test
```

## Design choices
- Polling (every 5s) + queue: simpler reasoning.
- Idempotency: `sha256(noteId:releaseAt)` → `X-Idempotency-Key` header.
- Backoff: 1s → 5s → 25s, max 3 tries.
- Indexes: `releaseAt` asc to find due; `status` to list quickly.
- Security: one admin Bearer token + IP rate limit.
