# Components

Component tree for the main screens of the M1 frontend prototype (Vue 3 + TypeScript, `web/`).

Sources: the stories, entities and messages come from `PROPOSAL.md`; the layout follows the wireframes in
`docs/wireframes/`; what M1 must include comes from `MILESTONES.md`.

**Legend**
- **Props**: data a parent passes down (read-only in the child).
- **Events**: what a child tells its parent (`emit`).
- **State**: who owns the data. *Store* = Pinia store, shared by many screens.
  *Local* = a `ref` inside one component, gone when you leave the page.
- **(later)**: part of the design but built after M1. M1 leaves it out or shows it disabled.

## Screens in M1

**How the addresses are organised.** An address names the thing, not the role: plural nouns
(`/products`, `/moves`), `new` and `edit` under their resource (`/products/new`, `/products/:id/edit`), and
related pages under one word (`/reports/monthly`, `/settings/suppliers`). Each page has one address for both
roles; the route guard checks who may open it (`meta.managerOnly`), the same way the API checks the role.
Filters are named in the query (`/products?stock=low`, `/moves?status=pending`, `/moves?reason=delivery`).

| # | Screen | Route | Who | Story |
|---|---|---|---|---|
| 1 | Log in | `/login` | everyone | 2 |
| 2 | Home menu (where login lands) | `/` | both roles | 2 |
| 3 | Dashboard ("Today") | `/dashboard` (staff view or manager view) | both roles | 6, 8 |
| 4 | Products | `/products` | both roles | 3 (stretch: search + pagination) |
| 5 | Product page | `/products/:id` | both roles | 4, 5 |
| 6 | New / Edit product | `/products/new`, `/products/:id/edit` | manager only | 7 |
| 7 | Moves | `/moves` (staff: their own; manager: everyone's) | both roles | 6, 8 |
| 8 | Move page | `/moves/:id` | both roles (staff: own moves only) | 6, 8 |
| 9 | Approvals, Write-off history | `/approvals`, `/approvals/history` | manager only | 8 |
| 10 | Reorder list | `/reorder` | manager only | 9 |
| 11 | Monthly report, Moves by product | `/reports/monthly`, `/reports/moves-by-product` (`/reports` opens the first) | manager only | 9 |
| 12 | Staff accounts | `/staff`, `/staff/new`, `/staff/:id`, `/staff/:id/edit` | manager only | 1, 10 |
| 13 | Categories, Suppliers | `/settings/categories`, `/settings/suppliers` (`/settings` opens the first) | manager only | 10 |
| 14 | My profile, Change password | `/profile`, `/profile/password` | both roles | 1 |
| 15 | Not found | any other address (shown there) | everyone | 6 (404 page) |
| 16 | Access error | the manager page's own address (shown there) | staff on a manager page | 10 (403) |

**Route guard** (`src/router/index.ts`, `meta` on each route):

| Rule | What happens |
|---|---|
| Not logged in, page is not `public` | `/login?redirect=<the page>`; after logging in you go back there, else to the home menu `/` (story 2) |
| Logged in and opening `/login` | the home menu `/` |
| Still on a temporary password (`auth.mustChangePassword`) | `/profile/password`, until a new one is saved (story 1) |
| Staff opening a `managerOnly` page | the address stays; `App.vue` shows `ForbiddenView` ("Only managers can open this page.") instead of the page (`accessDenied` in the router), and the tab says "Access error" (story 10) |

## Stores (shared state)

| Store | State | Actions / getters | Why it is a store |
|---|---|---|---|
| `useAuthStore` | `user: User \| null`, `token` (saved in `localStorage`) | `login(input)`, `logout()`; `isLoggedIn`, `isManager`, `mustChangePassword` | The top bar, the home menu, the dashboard and the route guard all need to know who is logged in. |
| `useProductStore` | `page: Page<Product>`, `loading`, `error`; `all: Product[]`; `current`, `currentLoading`, `currentError`, `currentNotFound` | `fetchPage(query)` (search, filters, `sort`, page), `fetchAll()`, `fetchOne(id)`, `save`, `setArchived`, `remove`, `replace(product)`, `byId(id)`; `lowStock` (quantity ≤ reorderLevel) | Products, the product page, the dashboard and Approvals all show products; a saved movement must change the quantity on every page. |
| `useCatalogStore` | `categories`, `suppliers`, `users`, `loaded`, `error` | `fetchAll()` (once), `fetchUsers()` (manager); `categoryName(id)`, `supplierName(id)`, `userName(id)` | Products are grouped and filtered by category and supplier; a PURCHASE needs a supplier (story 4); Approvals shows who recorded each write-off. Loaded once, used on many pages. |
| `useMovementStore` | `forProduct`, `mine`, `recent`, `pending`, `loading`, `error`, `saving`, `lastDelivery: { supplierId, invoiceNo } \| null` | `fetchByProduct(productId)`, `fetchMine()`, `fetchRecent()`, `fetchPending()`, `create(input)`, `approve(id)`, `reject(id, reason)`; `pendingCount` | A new movement changes the product's quantity, the dashboard and the approvals list. `lastDelivery` keeps the supplier and invoice of the delivery you are unpacking for the next product, so it must outlive one product page. |

Stores call the service layer in `src/api/` (`http.ts` plus `auth.ts`, `products.ts`, `movements.ts`,
`categories.ts`, `suppliers.ts`, `users.ts`); components never call `fetch` themselves.

Small shared helpers that are not stores live in `src/composables/`:

| Composable | What it gives | Used by |
|---|---|---|
| `useCounts()` | `counts` (`pending`, `low`, `rejected`) and `load()` | top bar, home menu, `App.vue` |
| `useDropdown(root)` | `open`, `toggle()`, `close()`; closes on a click outside or Escape | `SectionSwitcher`, `AccountMenu`, `FilterMenu` |
| `useToast()` | `current`, `show(kind, message, action?)`, `close()`; one message for the whole app. `action` is a button in the message, `{ label: 'Undo', run }`; the message then stays 8 seconds instead of 5 | `App.vue` shows it; pages call `show` after a save, approve or reject |
| `useRecordDialog()` | `type`, `productId`, `open(type, productId?)`, `close()`; one Receive / Send out dialog for the whole app | `App.vue` shows it; Today, home menu, Products, Moves, the search palette open it |
| `useFolded()` | `isOpen(key)`, `toggle(key)`; group rows in a table that fold away | every table with Group by |
| `useLastMoves()` | `ids`: the moves shown by the last moves list, in order | Moves and Approvals set it; the move page's "3 / 10" pager reads it |

Sorting and filtering helpers (plain TypeScript, no Vue):

| File | What it gives |
|---|---|
| `utils/sort.ts` | `SortState` (`{ id, dir }`), `nextSort(current, id)` (A→Z, then Z→A), `sortRows(rows, sort, keys)` |
| `components/search/filters.ts` | `FilterOption` (id, label, `test(row)`), `GroupOption` (id, label, `key(row)`), `DefaultView`, `applyFilters`, `viewTags`, `resetTag`, `isDefaultView`, `groupRows` |

**Tags show only what differs from the list's usual view** (`DefaultView`): Products opens on Active, grouped by
Category; Moves on the last 30 days (or the section's filter); Reorder grouped by Supplier. Those get no tag; the
Filters menu still ticks them. Changing one gives a tag ("Archived", "All dates", "No grouping"), and × on it goes
back to the usual choice, not to nothing.
| `utils/lastVisit.ts` | `rememberVisit()` / `lastVisit()`: the last product or move opened in this tab (`sessionStorage`), for "Continue: …" |

## App shell (every page after logging in)

There is **no sidebar**. You move around with the blue top bar and the home menu.

```
App.vue                             loads the counts and the catalog after logging in
├── TopBar                          hidden on /login
│   ├── home menu button            grid icon → / (a RouterLink in TopBar)
│   ├── SectionSwitcher             current section ▾ (e.g. "Products ▾"), lists every app; on tablets and
│   │                               phones also the section's own pages (or "ShopStock" outside a section)
│   ├── SectionMenu                 the section's own pages, e.g. All products · Low stock (wide screens)
│   │   └── CountBadge              e.g. To approve 3
│   ├── GlobalSearch                "Search…" button (an icon on tablets and phones)
│   │   └── SearchPalette           type to jump: Products · Actions (Receive goods, Send out stock, New product,
│   │                               Add a staff account) · Go to (every page) · Staff; ↑ ↓ Enter, Esc
│   └── AccountMenu                 your name ▾ → My profile, Change password, Log out
├── <RouterView />                  the current page
├── RecordDialog                    Receive stock / Send out stock (see below)
└── ToastMessage                    message after a save, approve or reject; "Undo" after archive / deactivate

HomeMenuView                        the home menu, route `/`
├── WelcomeBand                     date, "Good afternoon, Dara", what is waiting (links),
│                                   "Continue: Coca-Cola 330ml…" (last product or move opened), Receive · Send out
└── AppTile (×n)                    icon + name, CountBadge (Approvals 3, Reorder 4)
```

The apps and their pages are one config file, `src/apps.ts`: `appsFor(role)` returns each app's id, label, icon,
route, count and pages. The manager sees Today, Products, Moves, Approvals, Reorder, Report, Staff accounts,
Categories, Suppliers and My profile; staff see Today, Products, My moves and My profile.

| Component | Props | Events | State |
|---|---|---|---|
| `TopBar` | — | — | reads `useAuthStore`, the current route and `apps.ts`; calls `auth.logout()` |
| `SectionSwitcher` | `current: AppDef`, `apps: AppDef[]`, `counts`, `pages: MenuItem[]` | — | **Local**: `open` |
| `SectionMenu` | `items: MenuItem[]` (label, to, current, count?) | — | — |
| `CountBadge` | `count: number`, `label?` | — | — (hidden when 0) |
| `GlobalSearch` | — | — | **Local**: `open` (the palette) |
| `SearchPalette` | `open` | `close` | **Local**: `text`, `active` (the chosen row). Reads products, `catalog.users` (manager), `apps.ts` |
| `AccountMenu` | `user: User` | `logout` | **Local**: `open` |
| `ToastMessage` | `kind: 'success' \| 'error'`, `message`, `actionLabel?` | `close`, `action` | — |
| `HomeMenuView` | — | — | **Store**: `auth.user`, `movements`, `products.lowStock` (through `useCounts`); `lastVisit()` |
| `WelcomeBand` | `name: string`, `waiting: { text, to }[]`, `continueLink?: { text, to }` | `receive`, `send-out` | — |
| `AppTile` | `app: AppDef`, `count?: number` | — | — (a `RouterLink`, or a disabled tile) |

## Shared pieces

| Component | Props | Events | Used on |
|---|---|---|---|
| `AppIcon` | `name` (from `components/icons.ts`), `size?` | — | everywhere |
| `AppLogo` | `size?` | — | login |
| `StockBadge` | `product: Product` | — | "Low stock" when quantity ≤ reorderLevel, else "In stock" |
| `StatusBadge` | `status: MovementStatus` | — | Applied / Pending / Rejected |
| `FormField` | `id`, `label`, `v-model: string`, `type?`, `error?`, `help?`, `autocomplete?`, `multiline?`, `required?` (red *), `horizontal?` (label on the left), `mono?` | `update:modelValue` | every form |
| `BaseDialog` | `open`, `title`, `size?`; slot with `.dialog-body` and `.dialog-foot` | `close` (×, Escape) | every dialog |
| `ConfirmDialog` | `open`, `title`, `text`, `okLabel`, `danger?`, `busy?` | `confirm`, `cancel` | "Delete Drinks? This can't be undone." |
| `FormSelect` | like `FormField`, with `options: { value, label }[]` (generic value type) | `update:modelValue` | product form |
| `FormAlert` | `kind: 'error' \| 'success' \| 'info'`, `message` | — | an error that belongs to no field |
| `BaseButton` | `variant?: 'primary' \| 'outline' \| 'danger' \| 'success'`, `type?`, `loading?`, `loadingText?`, `small?`, `disabled?` | `click` | forms and tables |
| `SearchBox` | `v-model: string`, `tags: FilterTag[]` (funnel tag for a filter, layers tag for the grouping), `placeholder`, `inputId`; slot for `FilterMenu` | `remove-tag(id)` | every list. On phones the tags shrink to pills ("funnel 1", "layers 1") that open the Filters menu |
| `FilterMenu` | `options: { id, label }[][]` (filter groups), `groupBys: { id, label }[]`, `v-model:on` (ticked ids), `v-model:group`, `defaults?: DefaultView` | — | Filters ▾: two columns, **Filters** and **Group by**. Inside a group ticks mean "or", across groups "and". **Reset to default** once something changed |
| `SortHeader` | `id`, `label`, `num?`, `v-model: SortState \| null` | — | a column header you click to sort (▲ A→Z, ▼ Z→A) |
| `GroupFold` | `title`, `count`, `open` | `toggle` | the title of a group row: "Drinks (5)" ▾ |
| `LoadingState` | `message?` | — | while a page loads |
| `EmptyState` | `message`, `detail?`, `icon?`; slot for a button | — | nothing to show |
| `ErrorState` | `message` | `retry` | a request failed: message + **Try again** |

## Receive / Send out dialog

The **Receive** and **Send out** buttons on Today, the home menu, Products, Moves and the search palette all open
one dialog (`App.vue` shows it, `useRecordDialog()` opens it). **In** / **Out** on a product row open it with that
product chosen.

```
RecordDialog                   "Receive stock" / "Send out stock"
├── FormSelect  Product *      "Choose a product" (active products)
├── RecordStockPanel embedded  reason, quantity, supplier + invoice (Delivery), note; ids start with "dialog-"
└── buttons                    Receive / Send out · Save & new · Cancel
```

The whole form shows before a product is chosen; "All 58", "Up to target" and "Stock after" appear once one
is, and what you typed stays. **Save & new** saves, keeps the dialog open and clears the product, so the next product of the same delivery keeps
its supplier and invoice (`lastDelivery`).

## 1. Log in: `/login`

```
LoginView                     logo + "ShopStock" card; Demo accounts: Staff · Manager (mock only)
└── LoginForm
    ├── FormAlert  error from the API
    ├── FormField  Username
    ├── FormField  Password (type="password")
    ├── BaseButton Log in  ("Logging in…" while waiting)
    └── "No account? Ask your manager."
```

| Component | Props | Events | State |
|---|---|---|---|
| `LoginView` | — | — | **Local**: `loading`, `error`. Calls `auth.login()`, then goes to `?redirect=` or the home menu `/` |
| `LoginForm` | `loading: boolean`, `error: string \| null` | `submit({ username, password })` | **Local**: `username`, `password`, field errors ("Enter your username", "Enter your password"). `fill()` lets the demo buttons fill it |

Messages (story 2): "Invalid username or password", "This account is deactivated".

## 2. Dashboard ("Today"): `/dashboard`

One view on both routes; what it shows depends on the role.

```
DashboardView
├── white band                date + "Nothing recorded yet today · 3 things need your attention"
├── QuickActions              Receive goods · Send to the shop (both open the Receive / Send out dialog) ·
│                             Find a product (staff) / New product (manager)
├── LoadingState / ErrorState
├── AttentionPanel            "Needs your attention" + CountBadge
│   ├── TaskRow (×n)          staff: rejected write-offs (with the reason), write-offs waiting, products running low
│   │                         manager: write-offs waiting (Approve · Reject), products to reorder, accounts
│   │                         without a password yet
│   └── all clear             "All caught up. Nothing is waiting for you."
├── ActivityPanel             staff: "My recent moves" / manager: "Recent activity" · See all
│   └── item (×n)             "Sokha sent out 6 cases Coca-Cola", "Nov 8, 08:20 · To the shop"; or "No moves yet"
└── RejectDialog              opens on Reject (manager)
```

| Component | Props | Events | State |
|---|---|---|---|
| `DashboardView` | — | — | **Store**: `auth.user`, movements, `products.lowStock`, `catalog.userName`. **Local**: `loading`, `busyId`, `rejectingId` |
| `QuickActions` | `isManager: boolean` | `receive`, `send-out` | — |
| `AttentionPanel` | `tasks: Task[]`, `busy: boolean` | `approve(id)`, `reject(id)` | — |
| `TaskRow` | `task: Task` (tone, icon, title, detail, link?, approveId?), `busy` | `approve(id)`, `reject(id)` | — |
| `ActivityPanel` | `title`, `items: Activity[]` (who, verb, amount, product, when, kind) | — | — |

Story 6: the staff dashboard never shows a cost price or stock value. Approve / Reject on the manager's
dashboard use the same `RejectDialog` as Approvals. Receive and Send out open Products: the Record stock form is
on the product page, so you choose the product first.

## 3. Products: `/products`

The page opens on cards grouped by category; the list view (with pages) is one click away.

```
ProductsView
├── white band (toolbar)
│   ├── New (manager) · Receive · Send out
│   │   or, with ticked rows: "2 selected Unselect" · Archive · Unarchive (manager)
│   ├── SearchBox                      "Search by name or SKU…"; a tag only for a change, e.g. "Low stock ×"
│   │   └── FilterMenu                 Filters: Low stock · Out of stock | Active · Archived (manager)
│   │                                  Group by: Category · Supplier · Storage unit · Stock status
│   ├── ViewSwitch                     list | cards
│   └── "16 products"
├── LoadingState / ErrorState
├── EmptyState                         "No products match your search" + Clear search and filters
├── ProductKanban                      cards view
│   ├── column pager                   "Categories 1–4 of 6"  ‹ ›  (more than 4 columns: they scroll sideways;
│   │                                  tablets and phones stack them instead); not grouped: one grid
│   └── ProductColumn (×n)             group name + count, green / orange line
│       ├── ProductCard (×n)           picture, name, SKU, category · supplier, "58 cases", StockBadge, StockBar
│       └── "Show 10 more"
├── list view (panel)
│   ├── ProductList                    [tick box] · Product ▲ · Category · Supplier · On hand ▲ + StockBar · Reorder at ▲
│   │                                  · Cost price ▲, Stock value ▲ (manager) · Status · + In · − Out;
│   │                                  group rows that fold, with the group's stock value
│   └── ListPager                      under the list: "Showing 1–10 of 16 products", Previous · 1 2 · Next,
│                                      Per page 10 / 20 / 50
└── ConfirmDialog                      "Archive 2 products? They leave the lists and get no more moves…"
```

| Component | Props | Events | State |
|---|---|---|---|
| `ProductsView` | — | — | **Store**: products, categories, suppliers, `loading`, `error`. **Local**: `search`, `filters`, `groupBy`, `sort`, `selected`, `view`, `page`, `perPage`. **URL**: `?stock=low`, `?q=`, `?category=`, `?supplier=` |
| `ViewSwitch` | `v-model: 'cards' \| 'list'` | `update:modelValue` | — |
| `ProductKanban` | `groups: ProductGroup[]`, `grouped`, `groupNoun`, `categoryName(id)`, `supplierName(id)` | — | **Local**: first column shown, cards shown per column |
| `ProductColumn` | `group`, `shown: number`, `categoryName(id)`, `supplierName(id)` | `show-more` | — |
| `ProductCard` | `product`, `categoryName`, `supplierName` | — | — (the whole card is a `RouterLink` to `/products/:id`) |
| `ProductList` | `groups`, `showMoney`, `selectable`, `categoryName(id)`, `supplierName(id)`, `v-model:sort`, `v-model:selected` | `record({ product, type })` → opens the Receive / Send out dialog | **Local**: folded groups |
| `StockBar` | `quantity`, `reorderLevel`, `targetLevel` | — | — |
| `ListPager` | `v-model:page`, `v-model:perPage`, `total`, `noun` | `update:page`, `update:perPage` | — (shown when there are more than 10) |

From the proposal (story 3 and the stretch feature): search by name or SKU ignoring upper and lower case
("coca"), filter by category, supplier and low stock only, 10 products per page (at most 50), and
"No products match your search" when nothing is found. The cards view asks for up to 50 products at once.

Sorting goes to the API with the page (`sort` in `ProductQuery`), because the list has pages. json-server sorts
name, quantity, reorder level and cost price itself; stock value (quantity × cost price) is sorted in the browser,
"mock only". **Archive** asks first; the message after it has **Undo**.

## 4. Product page: `/products/:id`

The detail page with a route parameter: the route has `props: true`, so `id` arrives as a prop. Two columns: the
product on the left, the stock level and **Record stock** on the right.

```
ProductDetailView
├── NotFoundView (unknown id) / LoadingState / ErrorState
├── white band                       product name · Edit, Actions ▾ (manager) · RecordPager "3 / 16" ‹ ›
├── sheet                            left
│   ├── title                        "Product", name, SKU, StockBadge, picture
│   ├── FieldGroup  General          SKU, category, supplier, storage unit; cost price, stock value (manager only)
│   ├── FieldGroup  Stock            on hand, reorder level, target level
│   └── tabs                         Stock moves (n) · Deliveries (n)
│       └── MovementTable            Date · Type · Reason (+ invoice, note) · Quantity · Stock after · By (manager)
│                                    · StatusBadge; 10 per page; "No moves yet" /
│                                    "Deliveries from a supplier show here with their invoice number."
└── side column                      right
    ├── StockLevelCard               "In stock", "58 / 60 cases", StockBar, "Reorder at 20 · 2 to target"
    ├── RecordStockPanel             the form with client-side validation
    └── ProductHistory (manager)     "History": every move, newest first, one heading per day; who, time, status,
                                     "Received · Delivery" (link to the move), "+12 cases → 58 on hand", supplier
                                     and invoice, approved / rejected by, the note
        ├── TypeToggle               Stock in | Stock out
        ├── ReasonChips              out: To the shop · Damaged · Expired · Return to supplier
        │                            in: Purchase · Return from shop
        ├── QuantityStepper          − [ ] +, quick amounts 1 · 5 · 10 · "All 58" (out) / "Up to target" (in)
        ├── Supplier (select)        Purchase only
        ├── FormField  Invoice no.   Purchase only, optional, up to 30 characters
        ├── FormField  Note          required for write-offs
        ├── hint                     "Stock after: 52 cases" / "Waiting for the manager's approval. …"
        ├── FormAlert                an API error that belongs to no field
        └── BaseButton               "Record stock in" / "Record stock out" ("Saving…")
```

On tablets and phones the order changes: Record stock first (the task), then the stock level, then the details.

| Component | Props | Events | State |
|---|---|---|---|
| `ProductDetailView` | `id: string` (route param) | — | **Store**: the product, its movements, suppliers, `lastDelivery`. **Local**: `tab`, `serverErrors`. **URL**: `?type=IN\|OUT` |
| `RecordPager` | `index`, `total`, `noun?` ("product" / "move") | `prev`, `next` | — |
| `ProductHistory` | `product`, `movements` (newest first), `userName(id)`, `supplierName(id)` | — | — |
| `FieldGroup` | `title`, `fields: { label, value, unit?, mono? }[]` | — | — |
| `MovementTable` | `movements`, `showBy: boolean`, `userName(id)`, `emptyText` | — | **Local**: page |
| `StockLevelCard` | `product: Product` | — | — |
| `RecordStockPanel` | `product` (null in the dialog until one is chosen), `suppliers`, `lastDelivery`, `isManager`, `saving`, `initialType`, `serverErrors`, `serverError` | `submit(input: NewMovement)`; `reset()` for the page | **Local**: type, reason, quantity, supplierId, invoiceNo, note, `tried` |
| `TypeToggle` | `v-model: 'IN' \| 'OUT'` | `update:modelValue` | — |
| `ReasonChips` | `type: 'IN' \| 'OUT'`, `v-model: Reason`, `error?` | `update:modelValue` | — |
| `QuantityStepper` | `v-model: string`, `quickAmounts: { label, value }[]`, `help`, `error?` | `update:modelValue` | — |

Defaults: Stock out starts with **To the shop**; Stock in starts with **Purchase** and the supplier and invoice
from `lastDelivery`, else the product's own supplier. A link can open the page on one side (`?type=IN`).

**Validation in `RecordStockPanel`, with the message under the field.** The rules are in
`src/utils/movementRules.ts` (`checkMovement`), which the mock API also uses, so both give the same words.
Messages show after the first try and update while you type; the cursor jumps to the first wrong field.

| Field | Rule | Message | From |
|---|---|---|---|
| Quantity | whole number from 1 to 10,000 | Quantity must be a whole number from 1 to 10,000 | story 4 |
| Quantity | stock out not more than in storage | Not enough stock: only N left | story 5 |
| Note | needed for Damaged, Expired, Return to supplier | A note is required for this reason * | story 5 |
| Supplier | needed for Purchase | Choose the supplier who delivered * | story 4 |
| Invoice no. | at most 30 characters | Invoice number can have at most 30 characters * | design |

\* The proposal gives the rule but not the words; this wording is ours, so keep it the same in the API later.

Story 5: To the shop changes the stock at once; a storekeeper's Damaged, Expired and Return to supplier wait for
the manager's approval (status Pending), and the panel says "Waiting for the manager's approval. Stock does not
change until then." A manager's write-off is applied at once.

The panel only **emits** `submit`; `ProductDetailView` calls `movements.create()`, which saves the movement and
reloads the product so the new quantity shows on every page. Then the page clears the form (`reset()`) and shows
a message ("Saved. Coca-Cola … now has 52 cases." or "Write-off recorded. It waits for the manager's approval.").

## 5. Approvals: `/approvals` (manager only)

Section pages in the top bar: **To approve 3** · Write-off history (`/approvals/history`: every
write-off of all time, the Moves list with the Write-offs filter).

```
ApprovalsView
├── white band
│   ├── SearchBox + FilterMenu       Filters: Damaged · Expired · Return to supplier | Not enough stock
│   │                                Group by: Reason · Recorded by · Product
│   └── "3 waiting", or with ticked rows: "2 selected" · Approve · Reject
├── LoadingState / ErrorState
├── EmptyState                       "Nothing to approve" / "No write-offs match your search"
├── ApprovalTable
│   ├── row (×n)                     [tick box] · Date ▲ · Product ▲ (picture, name, SKU) · Reason ▲ (+ note)
│   │                                · Quantity ▲ "−2 boxes" · In storage · Loss ▲ · Recorded by ▲ · Approve · Reject;
│   │                                a red edge when more than is left in storage
│   └── total row                    total loss
└── RejectDialog                     opens on Reject ("Reject 2 write-offs" for ticked rows)
    ├── FormField  Reason (textarea)
    └── BaseButton Cancel · Reject
```

| Component | Props | Events | State |
|---|---|---|---|
| `ApprovalsView` | — | — | **Store**: pending movements, products, users. **Local**: `search`, `filters`, `groupBy`, `sort` (oldest first), `selected`, `rejectingIds`, `busyId` |
| `ApprovalTable` | `groups`, `busyId`, `v-model:sort`, `v-model:selected` | `approve(id)`, `reject(id)` | **Local**: folded groups |
| `RejectDialog` | `open: boolean`, `busy: boolean`, `serverError?`, `count?` | `confirm(reason)`, `cancel` | **Local**: `reason`, error "Please give a reason for rejecting" |

Story 8: approving changes the stock; rejecting needs a reason. If the stock went down since the write-off was
recorded, approving shows "Not enough stock: only N left". Both show a message when done. Ticked rows are approved
one by one, so one that no longer fits the stock does not stop the others ("Not approved: #40: Not enough stock…").

## 6. Not found

```
NotFoundView
└── panel    "Not found", "This page does not exist.", Go to the start page · Go back
```

The catch-all route `/:pathMatch(.*)*`. `ProductDetailView` also shows it when the product id does not exist.

## Loading, empty, error and success

| State | What you see | Where |
|---|---|---|
| Loading | `LoadingState` with a spinner ("Loading products…"); buttons say "Logging in…", "Saving…", "Approving…" | every page that asks the API |
| Empty | `EmptyState`: "No products match your search" (+ Clear search and filters), "Nothing to approve", "No moves yet", "All caught up" | Products, Approvals, product page, dashboard |
| Error | `ErrorState`: the API message (e.g. "Cannot reach the server, please try again") + **Try again**; form errors under the field | every page; Record stock, login, Reject dialog |
| Success | `ToastMessage` at the bottom right, gone after 5 seconds (8 with **Undo**) | after recording stock, approving, rejecting, archiving, deactivating |

## 7. Moves: `/moves` ("My moves" for a storekeeper)

One address for both roles: a storekeeper sees their own moves, the manager everyone's (the view checks the
role). Section pages use the same view: the route passes `fixed` (a filter, e.g. `writeoff`) or `group` (e.g.
`product`). In the top bar: My moves: **All my moves · Waiting (`?status=pending`) · Rejected 1
(`?status=rejected`)**; Moves: **All moves · Deliveries (`?reason=delivery`) · Write-offs (`?reason=writeoff`)**;
Approvals: **Write-off history** (`/approvals/history`); Report: **Moves by product** (`/reports/moves-by-product`).

```
MovesView
├── white band
│   ├── Receive · Send out · Export (manager: a CSV of every matching move)
│   ├── SearchBox + FilterMenu       no tag for the usual "Last 30 days"
│   │                                Filters: In · Out · Adjustment | Pending · Applied · Rejected |
│   │                                Deliveries · To the shop · Write-offs | Today · Last 7 days · Last 30 days · This month
│   │                                Group by: Product · Type · Reason · Status · Day (+ Recorded by, Supplier: manager)
│   └── "1–10 / 18" ‹ ›
├── LoadingState / ErrorState / EmptyState ("No moves match your search", "No moves yet")
├── MovesTable                       Date ▼ (link) · Product ▲ · Type ▲ · Reason ▲ (+ invoice, note) · Quantity ▲
│   │                                · Stock after · Recorded by ▲, Value ▲ (manager) · Status ▲;
│   │                                waiting rows have an amber edge; group rows fold
│   └── total row (manager)          "Total value of applied moves"
└── ListPager                        "Showing 1–10 of 18 moves"
```

| Component | Props | Events | State |
|---|---|---|---|
| `MovesView` | `fixed?`, `group?` (from the route) | — | **Store**: `movements.page`, products, users. **Local**: `search`, `filters`, `groupBy`, `sort` (newest first), `page`, `perPage`. **URL**: `?type=`, `?status=`, `?reason=` |
| `MovesTable` | `groups`, `showManager`, `appliedValue`, `v-model:sort` | — | **Local**: folded groups |

Story 6: a storekeeper sees only their own moves, newest first, with their status. The mock filters, sorts and
pages in the browser (`listMovements`, marked "mock only"); the real API does it in one query.

## 8. Move page: `/moves/:id`

```
MoveDetailView
├── NotFoundView (unknown id, or another storekeeper's move: story 6) / LoadingState / ErrorState
├── white band                       "Move #33" · "3 / 10" ‹ › (through the list you came from)
├── Approve · Reject                 manager, while the write-off waits (RejectDialog)
├── sheet
│   ├── title                        "−2 packs", product name, Type, StatusBadge, date, picture
│   ├── hint                         "Waiting for the manager's approval…" / "Rejected: <reason>"
│   ├── FieldGroup  Move             product (link), type, reason, quantity, stock after ("Not changed yet")
│   ├── FieldGroup  Details          recorded by, date, supplier + invoice (Purchase), approved / rejected by,
│   │                                unit cost + value (manager only)
│   └── Note
└── MoveHistory                      who recorded it and when; who approved or rejected it and why
```

| Component | Props | Events | State |
|---|---|---|---|
| `MoveDetailView` | `id: string` (route param) | — | **Store**: `movements.current`, products, users; `useLastMoves()` for the pager. **Local**: `busy`, `rejecting` |
| `MoveHistory` | `movement`, `recordedBy`, `reviewedBy`, `amount` | — | — |

A storekeeper's list of users is not loaded (only the manager may read it), so the reviewer shows as "Manager".

## 9. Categories `/settings/categories` and Suppliers `/settings/suppliers` (manager only)

Two tiles on the home menu, one **Settings** section in the top bar: **Categories · Suppliers**. One view on both
routes; the route passes `kind: 'categories'` or `kind: 'suppliers'`.

```
CatalogView
├── white band                       + New category / + New supplier · "4 categories"
├── LoadingState / ErrorState / EmptyState ("No categories yet")
├── CatalogTable                     Name ▲ · Description (or Phone · Email · Address) · Products ▲ (link) · Edit · Delete
├── CatalogDialog                    New / Edit: Name *, Description (or Phone, Email, Address)
└── ConfirmDialog                    "Delete Drinks? This can't be undone."
```

| Component | Props | Events | State |
|---|---|---|---|
| `CatalogView` | `kind` (from the route) | — | **Store**: `catalog.categories` / `suppliers`, products (for the counts). **Local**: `editing`, `dialogOpen`, `deleting` |
| `CatalogTable` | `kind`, `items`, `productCount(id)` | `edit(item)`, `delete(item)` | **Local**: `sort` |
| `CatalogDialog` | `open`, `kind`, `item` (null = new), `busy`, `serverError` | `save(form)`, `cancel` | **Local**: the form, "Name is required" |

| Action | Rule | Message | From |
|---|---|---|---|
| Add / edit | a name is needed | Name is required * | design |
| Add / edit | no other with the same name (ignoring case) | This name is already used * | design |
| Delete | not while products use it; a supplier also not while deliveries name it | Move or delete its products first | story 10 |

The product count opens Products filtered by that category or supplier (`/products?category=2`). The checks are
"mock only" in `src/api/categories.ts` and `suppliers.ts`; the API does them in M2.

## 10. Products for the manager (story 7) and Adjust stock (story 8)

On the product page the manager also gets:

```
ProductDetailView (manager)
├── white band        name · Edit (→ /products/:id/edit) · ProductActions ▾ (Archive or Restore, Delete)
├── Adjust stock      button above the sheet → AdjustDialog
├── sheet             stat tiles "6 Moves" · "$556.80 Stock value"; "Archived: …" message when archived
├── side              no Record stock form while archived ("Restore it to record stock")
└── ConfirmDialog     "Delete Coca-Cola…? This can't be undone."
```

```
ProductFormView                       /products/new and /products/:id/edit
├── white band                        "New" / "Edit: <name>" · "New product, not saved yet" / "Editing" /
│                                     "Unsaved changes" · Cancel · Save product
└── sheet
    ├── Product name *                big box, the SKU under it
    ├── General                       SKU *, Category *, Supplier, Storage unit *
    └── Stock                         "A new product starts at 0." Reorder level *, Target level *, Cost price *
```

| Component | Props | Events | State |
|---|---|---|---|
| `ProductFormView` | `id?: string` (none = new) | — | **Local**: the form (numbers kept as text), `tried`, `serverErrors`; leaving with unsaved changes asks first |
| `ProductActions` | `archived: boolean` | `archive`, `restore`, `delete` | **Local**: `open` |
| `AdjustDialog` | `open`, `product`, `busy`, `serverErrors` | `confirm(counted, note)`, `cancel` | **Local**: counted, note; preview "Adjustment: −3 cases" |

| Field | Rule | Message | From |
|---|---|---|---|
| Name | needed | Name is required * | design |
| SKU | 3 capital letters, a dash, 4 digits (typed in any case) | SKU must be 3 letters, a dash and 4 digits, like DRK-0001 * | design |
| SKU | no other product has it | SKU already exists | story 7 |
| Category | needed | Choose a category * | design |
| Cost price | a number, 0 or more | Cost price must be 0 or more * | design |
| Reorder level | whole number, 0 or more | Reorder level must be a whole number, 0 or more * | design |
| Target level | whole number above the reorder level | Target level must be higher than the reorder level * | design |
| Delete | only without movements | Archive it instead | story 7 |
| Counted quantity | whole number 0–10,000, different from the system | No difference to adjust (story 8) / Counted quantity must be a whole number from 0 to 10,000 * | story 8 |
| Note (adjust) | needed | A note is required for an adjustment * | story 8 |

The rules are in `src/utils/productRules.ts` (`checkProduct`) and `movementRules.ts` (`checkAdjustment`), shared by
the forms and the mock API. A new product starts at quantity 0; only moves change the quantity. An adjustment is a
move of type ADJUST, applied at once, with the note. Archived products are left out of the list, the low-stock
counts and the "3 / 16" pager; Products → Filters → untick Active, tick Archived shows them (manager).

## 11. Reorder list `/reorder` and Monthly report `/reports/monthly` (story 9)

```
ReorderView
├── white band        "Suggested order = target level − on hand. ShopStock does not send orders." · search ·
│                     Filters: Out of stock · Group by: Supplier (default) · Category · "4 products"
└── table             one group per supplier (fold ▾, phone as a tel: link, group cost); "No supplier" last
                      Product ▲ · On hand ▲ · Reorder at · Target · Suggested order ▲ · Cost price · Estimated cost ▲; Total
```

```
ReportView
├── white band        month picker (the last 12 months) · losses by reason · Download ▾ (CSV spreadsheet, PDF print)
├── KPI tiles         Total stock value (today) · Stock in · Stock out · Losses
├── InOutChart        In and out by category (two bars per category, value at the tip, tooltip on hover / focus)
├── Most sent to the shop   top 5 by quantity
├── By category and product table: In, Out, Losses per category; a category opens to its products; Total
├── Losses            applied write-offs and stock found missing at a count, with their value
└── Slow-moving       in storage, nothing sent to the shop in 30 days (a nice-to-have from the proposal)
```

| Component | Props | Events | State |
|---|---|---|---|
| `ReorderView` | — | — | **Local**: the lines, search, filters, `groupBy`, `sort` (only this page uses them, so no store) |
| `ReportView` | — | — | **Local**: month, the report, opened categories, the Download menu |
| `InOutChart` | `rows: { label, in, out }[]` | — | an ECharts bar chart (only the bar chart, grid and tooltip parts are imported) |

Story 9: "3 left, target 20, order 17" is the Suggested order column; a month with no movements shows zeros and
"Nothing was sent to the shop this month." / "No losses this month.". The numbers come from `src/api/reports.ts`,
"mock only": the browser adds up products and moves; in M3 the API answers `GET /reports/reorder` and
`GET /reports/monthly?month=2026-11`. Only applied moves count; a loss is valued at the cost price of its day.

Chart colours: In `#2F6FCB`, Out `#E8913A`; checked for colour blindness. The orange is below 3:1 contrast on white,
so every bar has its value at the tip and the table under the chart has the same numbers.

Download: **CSV (spreadsheet)** saves `shopstock-report-2026-11.csv` (`utils/csv.ts`, with a byte-order mark so
Excel reads it as UTF-8); **PDF (print)** opens the browser's print dialog, and print styles hide the top bar and
buttons.

## 12. Accounts (stories 1 and 10)

```
StaffView           /staff: New · search · Filters: Active · Deactivated | Must change password ·
│                   Group by: Role · Status · "5 accounts"
└── table           avatar + name ▲ · Username ▲ · Phone · Role ▲ · Added ▲ · AccountStatus (Active / Must change
                    password / Deactivated); a row opens the account

AccountView         /staff/:id: name · Edit · "3 / 5" ‹ ›
├── Reset password  → ResetPasswordDialog (a new temporary password; they must change it at the next login)
├── Deactivate      → ConfirmDialog, then a message with Undo; Reactivate when deactivated
└── sheet           "Account", name, role, status, avatar; Login (username) · Contact (phone, added)

AccountFormView     /staff/new and /staff/:id/edit: Full name *, Username *, Temporary password * (new only), Phone *

ProfileView         /profile: Change password · name, role · Login (username, ••••••••) · Contact (phone, added)
PasswordView        /profile/password: Current (or Temporary) password *, New password *, Confirm new password *
ForbiddenView       at the manager page's address: "Access error · Only managers can open this page." · Go to the start page (/)
```

| Component | Props | Events | State |
|---|---|---|---|
| `StaffView` | — | — | **Store**: `catalog.users`. **Local**: search, filters, `groupBy`, `sort` |
| `AccountView` | `id` (route param) | — | **Store**: `catalog.users`. **Local**: `resetting`, `confirming`, `busy` |
| `AccountFormView` | `id?` (none = new) | — | **Local**: the form, `tried`, `serverErrors`; leaving with unsaved changes asks first |
| `PasswordView` | — | — | **Local**: the three passwords; `auth.mustChangePassword` picks "Set your new password" |
| `ResetPasswordDialog` | `open`, `name`, `busy`, `serverError` | `confirm(password)`, `cancel` | **Local**: password |
| `UserAvatar` | `name`, `size?` | — | — ("Dara Chan" → "DC") |
| `AccountStatus` | `user` | — | — |

| Field | Rule | Message | From |
|---|---|---|---|
| Username | not used by another account | This username is already taken | story 1 |
| Username | 3–20 lowercase letters or numbers | Username must be 3–20 lowercase letters or numbers * | design |
| Full name | needed | Full name is required * | design |
| Phone | 0 and 8 or 9 more digits (spaces allowed) | Phone must be 9 or 10 digits and start with 0 * | design |
| Password | 8+ characters with a letter and a number | Password must have 8 or more characters, with a letter and a number * | design |
| Current password | must match | Current password is wrong * | design |
| Confirm | same as the new one | The two passwords are not the same * | design |
| Deactivate | not your own account | You cannot deactivate your own account | story 10 |
| Log in | account deactivated | This account is deactivated | story 2 |

A new account starts with `mustChangePassword: true`; the route guard keeps that person on `/profile/password` and the
top bar shows only the account menu until they choose their own password. The manager's Today and home menu
show "Rithy Sok has not set a password yet". Rules: `src/utils/accountRules.ts`, shared by the forms and the mock
API (`src/api/users.ts`, `auth.ts`). The `passwords` list in `db.json` is mock only.

## Where state lives: rule of thumb

- **In a store** when two or more pages need it, or when it must survive leaving the page: the logged-in user,
  products, categories and suppliers, movements, and the delivery being unpacked (`lastDelivery`).
- **Local in a component** when only that component uses it and it can be thrown away: typed form values,
  field errors, search text and filters, cards or list, the current page, an open menu or dialog.
- **In the URL** when a link should open the same thing: the product id (`/products/:id`), "Low stock"
  (`/products?stock=low`, `/moves?status=pending`), a search (`/products?q=coca`) and the side of the form (`?type=IN`).
- **Module-level `ref` in a composable** when the whole app shares one small thing that is not data from the API:
  the toast, the Receive / Send out dialog, the ids for the move pager.
- **Props down, events up**: a child never changes a store or a prop itself. It emits an event, and the page
  (the view) talks to the store.
