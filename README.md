# ShopStock

Storage inventory for small shops: storekeepers record goods coming in and going out to the shop, and the manager approves write-offs, sees what to reorder and reads a monthly report. Live URL: _coming soon_.

## Screenshots

_Coming soon._

## Architecture

```
web (Vue) -> api (NestJS) -> PostgreSQL (Prisma)
```

- `web/` — Vue front end
- `api/` — NestJS REST API
- `docs/SPEC.md` — user stories, acceptance criteria and guard table

## Run it locally

M1 is the front end only: it talks to a mock API (`json-server` over `web/db.json`) until the NestJS API is ready.
You need Node.js 22.18 or newer.

```bash
cd web
npm install        # once
npm run api        # terminal 1: mock API on http://localhost:3001
npm run dev        # terminal 2: the app on http://localhost:5173
```

`npm run api` saves every change into `web/db.json`; `git checkout web/db.json` brings the demo data back.
More in `web/README.md` (every screen and its address, the other scripts).

## Environment variables

- `VITE_API_URL` (web): the API address, default `http://localhost:3001`.

## Test accounts

Every account uses the password `shopstock1`.

| Username | Role | Notes |
|---|---|---|
| `dara` | Manager | Approves write-offs, sees cost prices, reorder list and reports |
| `sokha` | Staff | Records stock in and out |
| `vanna` | Staff | A second storekeeper |
| `rithy` | Staff | Temporary password: must set a new one first |
| `thida` | Staff | Deactivated: cannot log in |

## API documentation

_Coming soon._

## Tests

_Coming soon._
