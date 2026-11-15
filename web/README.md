# ShopStock web

Vue 3 + TypeScript + Vite app for ShopStock (M1: frontend prototype). It talks to a mock API made with
`json-server` and `db.json`; the real NestJS API replaces it in M3.

## Run it

You need Node.js 22.18 or newer (`node -v`).

```bash
npm install        # once
npm run api        # terminal 1: mock API on http://localhost:3001 (answers after 400 ms, like a real server)
npm run dev        # terminal 2: the app on http://localhost:5173
```

Open http://localhost:5173 and log in. Every demo account uses the password **`shopstock1`**; the
**Staff** and **Manager** buttons under the login card fill the form for you.

| Username | Role | What to try |
|---|---|---|
| `dara` | Manager | Lands on the home menu `/`; Today (`/dashboard`) shows the manager view; approve or reject write-offs; sees cost prices |
| `sokha` | Staff | Lands on the home menu `/`; Today shows the staff view; records stock in and out; manager pages show the access error |
| `vanna` | Staff | A second storekeeper with a write-off waiting |
| `rithy` | Staff, temporary password | Must set a new password before anything else (story 1) |
| `thida` | Staff, deactivated | Shows "This account is deactivated" |

A wrong password shows "Invalid username or password".

`npm run api` writes every change (a new movement, an approval) into `db.json`. To get the demo data
back, stop the API and run `git checkout db.json`.

The script passes `--fks _fk` to json-server. Without it, json-server treats every field ending in `Id` as a
link: deleting a record would also delete the records that point to it, and it crashes on links that are
`null` (a product with no supplier). The app checks these rules itself ("Move or delete its products
first"), as the real API will.

To use another API address, set `VITE_API_URL` (default `http://localhost:3001`):

```bash
VITE_API_URL=http://localhost:4000 npm run dev
```

## Other scripts

```bash
npm run lint         # oxlint + ESLint (with --fix)
npm run type-check   # vue-tsc, strict TypeScript
npm run build        # type-check and build to dist/
```

## Screens

Addresses name the thing, not the role: a page has one address for everyone, and the route guard checks who
may open it (`meta.managerOnly`), the same way the API checks the role. Filters are named in the query.

| Route | Who | What |
|---|---|---|
| `/login` | everyone | Log in (story 2) |
| `/` | both roles | Home menu: one tile per section for your role, what is waiting; where login lands (story 2) |
| `/dashboard` | both roles | Today: the staff view (my work, waiting, low stock) or the manager view (approvals, reorder) (stories 6, 8) |
| `/products`, `/products?stock=low` | both roles | Cards or a list with 10 / 20 / 50 per page; search, filters, group by (story 3) |
| `/products/:id` | both roles | Product page with the Record stock form (stories 4, 5) |
| `/products/new`, `/products/:id/edit` | manager | New and edit product; archive, restore, delete and Adjust stock are on the product page (stories 7, 8) |
| `/moves`, `/moves?status=pending`, `/moves?reason=delivery` | both roles | Staff: their own moves (story 6). Manager: every move, total value, Export (CSV) |
| `/moves/:id` | both roles | One move and its history; another storekeeper's move shows 404 (story 6) |
| `/approvals`, `/approvals/history` | manager | Approve or reject write-offs, one or ticked together; every write-off of all time (story 8) |
| `/reorder` | manager | Products to reorder, grouped by supplier, with a suggested order (story 9) |
| `/reports/monthly`, `/reports/moves-by-product` | manager | Monthly report with a chart, top 5, losses, Download CSV or PDF; moves grouped by product (story 9) |
| `/staff`, `/staff/new`, `/staff/:id`, `/staff/:id/edit` | manager | Staff accounts: add with a temporary password, edit, reset password, deactivate (stories 1, 10) |
| `/settings/categories`, `/settings/suppliers` | manager | Add, edit and delete; not while products use them (story 10) |
| `/profile`, `/profile/password` | both roles | My profile and Change password; a temporary password must be changed first (story 1) |
| anything else | everyone | Not found (404), at the address you opened |

On every page: **Search…** in the top bar finds a product, a page or an action; **Receive** and **Send out**
open one dialog (Save & new for the next product of a delivery). Lists have **Filters ▾** with **Group by**
(a tag shows only what differs from the usual view), columns you click to sort, and group rows that fold. The
manager can tick products to archive them and write-offs to approve or reject them; archive and deactivate
show **Undo**. The home menu offers "Continue: …" back to the last product or move you opened.

The route guard in `src/router/index.ts` sends a visitor who is not logged in to `/login` (and back after
logging in), keeps someone with a temporary password on `/profile/password`, and shows the access error
("Only managers can open this page.") at the same address when a storekeeper opens a manager page.

`db.json` keeps the demo passwords in plain text in a separate `passwords` list (mock only). The real API
keeps a bcrypt hash on the user instead and never sends it to the browser.

## Where things are

```
src/
  types.ts           Entities from the proposal (User, Product, StockMovement, …)
  api/               Service layer: http.ts is the only file that calls fetch; one file per resource
  stores/            Pinia stores: auth, products, catalog (categories, suppliers, users), movements
  router/index.ts    Routes and the route guard
  apps.ts            The apps on the home menu and in the top bar, per role
  views/             One component per route
  components/        The pieces the views are built from (see docs/components.md)
  composables/       Small shared helpers (counts, dropdowns, the message after a save, the Receive / Send out
                     dialog, folding groups, the move pager)
  utils/             movementRules.ts, productRules.ts, accountRules.ts (the forms and the mock API use the
                     same checks), sort.ts, csv.ts, format.ts, errors.ts, lastVisit.ts
db.json              Mock data: users, categories, suppliers, products, movements
```
