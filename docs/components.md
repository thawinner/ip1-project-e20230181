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

| # | Screen | Route | Who | Story |
|---|---|---|---|---|
| 1 | Log in | `/login` | everyone | 2 |
| 2 | Dashboard ("Today") | `/dashboard`, `/manager/dashboard` | staff, manager | 2, 6 |
| 3 | Products | `/products` | both roles | 3 (stretch: search + pagination) |
| 4 | Product page | `/products/:id` | both roles | 4, 5 |
| 5 | Approvals | `/manager/approvals` | manager only (route guard) | 8 |
| 6 | Not found | any other path | everyone | 6 (404 page) |

The home menu (`/apps`) is part of the app shell below. Story 2 says each role lands on its own dashboard after
logging in, so login goes to `/dashboard` or `/manager/dashboard`, and the home menu is one click away (grid button).

## Stores (shared state)

| Store | State | Actions / getters | Why it is a store |
|---|---|---|---|
| `useAuthStore` | `user: User \| null`, `token` | `login(username, password)`, `logout()`; `isManager` | The top bar, the home menu, the dashboard and the route guard all need to know who is logged in. |
| `useProductStore` | `products: Product[]`, `loading`, `error` | `fetchProducts()`, `fetchProduct(id)`; `lowStock` (quantity ≤ reorderLevel) | Products, the product page, the dashboard and Approvals all show products; a saved movement must change the quantity on every page. |
| `useCatalogStore` | `categories: Category[]`, `suppliers: Supplier[]` | `fetchAll()` | Products are grouped and filtered by category and supplier; a PURCHASE needs a supplier (story 4). Loaded once, used on many pages. |
| `useMovementStore` | `movements: StockMovement[]`, `loading`, `error`, `lastDelivery: { supplierId, invoiceNo } \| null` | `fetchByProduct(productId)`, `fetchMine()`, `fetchPending()`, `createMovement(input)`, `approve(id)`, `reject(id, reason)`; `pendingCount` | A new movement changes the product's quantity, the dashboard and the approvals list. `lastDelivery` keeps the supplier and invoice of the delivery you are unpacking for the next product, so it must outlive one product page. |

Stores call the service layer in `src/api/` (`http.ts` plus `products.ts`, `movements.ts`, `categories.ts`,
`suppliers.ts`, `users.ts`); components never call `fetch` themselves.

## App shell (every page after logging in)

There is **no sidebar**. You move around with the navy top bar and the home menu.

```
App.vue
├── TopBar                          hidden on /login
│   ├── HomeMenuButton              grid icon → home menu
│   ├── SectionSwitcher             current section ▾ (e.g. "Products ▾"), lists every app
│   ├── SectionMenu                 the section's own pages, e.g. All products · Low stock
│   │   └── CountBadge              e.g. To approve (3)
│   ├── GlobalSearch                "Search…"
│   └── AccountMenu                 your name ▾ → Log out (My profile, Change password: later)
├── <RouterView />                  the current page
└── ToastMessage                    message after a save, approve or reject

HomeMenuView                        the home menu, route `/apps`
├── WelcomeBand                     "Good evening, Dara", date, Receive · Send out
└── AppGrid
    └── AppTile (×n)                icon + name, CountBadge (Approvals 3, Reorder 7)
```

The apps and their pages are one config file, `src/apps.ts` (id, label, icon, route, roles, pages), filtered by
role: the manager sees Today, Products, Moves, Approvals, Reorder, Report, Staff accounts,
Settings (categories and suppliers) and My profile; staff see Today, Products, My moves and My profile. In M1, apps whose
pages are not built yet are shown disabled.

| Component | Props | Events | State |
|---|---|---|---|
| `TopBar` | — | — | reads `useAuthStore`, the current route and `apps.ts` |
| `SectionSwitcher` | `current: App`, `apps: App[]` | — | **Local**: `open` |
| `SectionMenu` | `items: MenuItem[]` (label, to, count?) | — | — |
| `CountBadge` | `count: number` | — | — |
| `GlobalSearch` | — | `search(text)` | **Local**: `text` |
| `AccountMenu` | `user: User` | `logout` | **Local**: `open` (TopBar calls `auth.logout()`) |
| `ToastMessage` | `kind: 'success' \| 'error'`, `message` | `close` | — |
| `HomeMenuView` | — | — | **Store**: `auth.user`, `movements.pendingCount`, `products.lowStock` |
| `WelcomeBand` | `name: string` | `receive`, `send-out` | — |
| `AppTile` | `app: App`, `count?: number` | — | — (a `RouterLink`) |

## 1. Log in: `/login`

```
LoginView
└── LoginCard                 logo + "ShopStock"
    └── LoginForm
        ├── FormField  Username
        ├── FormField  Password (type="password")
        ├── FormAlert  error from the API
        └── BaseButton Log in  ("Logging in…" while waiting)
```

| Component | Props | Events | State |
|---|---|---|---|
| `LoginView` | — | — | calls `auth.login()`, then goes to `/dashboard` or `/manager/dashboard` |
| `LoginForm` | `loading: boolean`, `error: string \| null` | `submit({ username, password })` | **Local**: `username`, `password`, field errors ("Enter your username", "Enter your password") |
| `FormField` | `id`, `label`, `modelValue`, `type?`, `error?`, `help?` | `update:modelValue` | — (used with `v-model`) |
| `FormAlert` | `kind: 'error' \| 'success' \| 'info'`, `message` | — | — |
| `BaseButton` | `variant?: 'primary' \| 'outline'`, `loading?`, `type?` | `click` | — |

Messages (story 2): "Invalid username or password", "This account is deactivated".

## 2. Dashboard ("Today"): `/dashboard` (staff), `/manager/dashboard` (manager)

One view on both routes; what it shows depends on the role.

```
DashboardView
├── TodayHeader               date + "You recorded 3 moves today" / "Nothing recorded yet today"
├── QuickActions              Receive goods · Send to the shop · Find a product (staff) / New product (manager, later)
├── AttentionPanel            "Needs your attention" + count
│   ├── TaskRow (×n)          staff: rejected write-offs (with the reason), write-offs waiting, products running low
│   │                         manager: write-offs waiting (Approve · Reject), products to reorder
│   └── AllClear              "All caught up. Nothing is waiting for you."
└── ActivityPanel             staff: "My recent moves" / manager: "Recent activity"  + See all (later)
    ├── ActivityItem (×n)     "received 12 cases Coca-Cola", date
    └── EmptyState            "No moves yet"
```

| Component | Props | Events | State |
|---|---|---|---|
| `DashboardView` | — | — | **Store**: `auth.user`, movements, `products.lowStock` |
| `TodayHeader` | `count: number`, `isManager` | — | — |
| `QuickActions` | `isManager: boolean` | `receive`, `send-out` | — |
| `AttentionPanel` | `tasks: Task[]` | `approve(id)`, `reject(id)` | — |
| `TaskRow` | `task: Task` (kind, title, detail, action) | `approve`, `reject` | — |
| `ActivityPanel` | `movements: StockMovement[]`, `title` | — | — |

Story 6: the staff dashboard never shows a cost price or stock value. Approve / Reject on the manager's
dashboard use the same `RejectDialog` as Approvals.

## 3. Products: `/products`

The page opens on cards grouped by category; the list view (with pages) is one click away.

```
ProductsView
├── ControlPanel                       one toolbar row
│   ├── BaseButton  New                manager only (later)
│   ├── BaseButton  Receive · Send out
│   ├── SearchBox                      "Search by name or SKU…"
│   │   ├── FilterTag (×n)             "Category ×", "Low stock ×"
│   │   └── FilterMenu                 Filters ▾: category, supplier, low stock only
│   └── ViewSwitch                     list | cards
├── LoadingState / ErrorState
├── EmptyState                         "No products match your search"
├── ProductKanban                      cards view
│   ├── ColumnPager                    "Categories 1–4 of 6"  ‹ ›
│   └── CategoryColumn (×n)            category name + count
│       ├── ProductCard (×n)           picture, name, SKU, "3 cases", StockBadge, StockBar
│       └── ShowMoreButton             "Show 10 more"
└── ProductList                        list view
    ├── ProductRow (×n)                name, SKU, quantity + unit, StockBadge, In · Out
    └── Pager                          "1–10 / 32"  Previous · Next, Per page 10 / 20 / 50
```

| Component | Props | Events | State |
|---|---|---|---|
| `ProductsView` | — | — | **Store**: products, categories, suppliers, `loading`, `error`. **Local**: `search`, `filters`, `view`, `page`, `perPage` |
| `ControlPanel` | `isManager: boolean` | `new`, `receive`, `send-out` | — (slots for the search box and view switch) |
| `SearchBox` | `modelValue: string`, `tags: FilterTag[]` | `update:modelValue`, `remove-tag(id)` | — |
| `FilterMenu` | `filters: ProductFilters`, `categories`, `suppliers` | `change(filters)` | **Local**: `open` |
| `ViewSwitch` | `modelValue: 'cards' \| 'list'` | `update:modelValue` | — |
| `ProductKanban` | `groups: { category: Category, products: Product[] }[]` | — | **Local**: first column shown, cards shown per column |
| `CategoryColumn` | `category: Category`, `products: Product[]` | `show-more` | — |
| `ProductCard` | `product: Product` | — | — (the whole card is a `RouterLink` to `/products/:id`) |
| `ProductList` | `products: Product[]` | `record({ product, type })` | — |
| `StockBadge` | `product: Product` | — | — ("Low stock" when quantity ≤ reorderLevel, else "In stock") |
| `StockBar` | `quantity`, `reorderLevel`, `targetLevel` | — | — |
| `Pager` | `page`, `perPage`, `total` | `update:page`, `update:perPage` | — |
| `LoadingState` / `EmptyState` | `message?` | — | — |
| `ErrorState` | `message` | `retry` | — |

From the proposal (story 3 and the stretch feature): search by name or SKU ignoring upper and lower case
("coca"), filter by category, supplier and low stock only, 10 products per page (at most 50), and
"No products match your search" when nothing is found.

## 4. Product page: `/products/:id`

The detail page with a route parameter: the route has `props: true`, so `id` arrives as a prop. Two columns: the product on the left, the stock level and **Record stock** on the right.

```
ProductDetailView
├── LoadingState / ErrorState / NotFoundView (unknown id)
├── RecordHeader                     product name · Edit (manager, later) · Actions ▾ (later)
│   └── RecordPager                  "8 / 32"  ‹ ›
├── ProductSheet                     left
│   ├── StatusBar                    Adjust stock (manager, later)
│   ├── StatTile ×2                  "38 Moves" · "Stock value" (manager only)
│   ├── ProductSummary               picture, name, SKU, StockBadge
│   ├── FieldGroup  General          category, supplier, unit, cost price (manager only)
│   ├── FieldGroup  Stock            in storage, reorder level, target level
│   └── TabPanel                     Stock moves (n) · Deliveries (n)
│       ├── MovementTable            Date · Type · Reason · Quantity · Stock after · By (manager) · Status
│       │   └── StatusBadge          Applied / Pending / Rejected
│       └── EmptyState               "No moves yet" / "Deliveries from a supplier show here with their invoice number."
└── side column                      right
    ├── StockLevelCard               StockBadge, "14 / 72", StockBar
    └── RecordStockPanel             the form with client-side validation
        ├── TypeToggle               Stock in | Stock out
        ├── ReasonChips              out: To the shop · Damaged · Expired · Return to supplier
        │                            in: Purchase · Return from shop
        ├── QuantityStepper          − [ ] +
        │   └── QuickAmounts         1 · 5 · 10 · "All 14" (out) / "Up to target" (in)
        ├── FormField  Supplier      Purchase only
        ├── FormField  Invoice no.   Purchase only, optional, up to 30 characters
        ├── FormField  Note
        ├── StockAfterHint           "Stock after: 8" / "Waiting for the manager's approval…"
        └── BaseButton               "Record stock in" / "Record stock out"
```

| Component | Props | Events | State |
|---|---|---|---|
| `ProductDetailView` | `id: string` (route param) | — | **Store**: the product, its movements, suppliers, `lastDelivery` |
| `RecordHeader` | `title`, `canEdit: boolean` | `edit` | — |
| `RecordPager` | `index`, `total` | `prev`, `next` | — |
| `StatTile` | `label`, `value` | — | — |
| `ProductSummary` | `product: Product` | — | — |
| `FieldGroup` | `title`, `fields: { label, value }[]` | — | — |
| `TabPanel` | `tabs: { id, label }[]`, `modelValue` | `update:modelValue` | — |
| `MovementTable` | `movements: StockMovement[]`, `showBy: boolean` | — | — |
| `StatusBadge` | `status: MovementStatus` | — | — |
| `StockLevelCard` | `product: Product` | — | — |
| `RecordStockPanel` | `product: Product`, `suppliers: Supplier[]`, `lastDelivery`, `isManager`, `saving: boolean` | `submit(input: NewMovement)` | **Local**: type, reason, quantity, supplierId, invoiceNo, note, field errors |
| `TypeToggle` | `modelValue: 'IN' \| 'OUT'` | `update:modelValue` | — |
| `ReasonChips` | `type: 'IN' \| 'OUT'`, `modelValue: Reason` | `update:modelValue` | — |
| `QuantityStepper` | `modelValue: number \| null`, `quickAmounts: { label, value }[]` | `update:modelValue` | — |

Defaults: Stock out starts with **To the shop**; Stock in starts with **Purchase** and the
supplier set to `lastDelivery`, else the product's own supplier.

**Validation in `RecordStockPanel`, with the message under the field:**

| Field | Rule | Message | From |
|---|---|---|---|
| Quantity | whole number from 1 to 10,000 | Quantity must be a whole number from 1 to 10,000 | story 4 |
| Quantity | stock out not more than in storage | Not enough stock: only N left | story 5 |
| Note | needed for Damaged, Expired, Return to supplier | A note is required for this reason * | story 5 |
| Supplier | needed for Purchase | Choose the supplier who delivered * | story 4 |
| Invoice no. | at most 30 characters | Invoice number can have at most 30 characters * | design |

\* The proposal gives the rule but not the words; this wording is ours, so keep it the same in the API later.

Story 5: To the shop changes the stock at once; Damaged, Expired and Return to supplier wait for the manager's
approval (status Pending), and the panel says "Waiting for the manager's approval. Stock does not change until then."

The panel only **emits** `submit`; `ProductDetailView` calls `movementStore.createMovement()`, then reloads the
product so the new quantity shows on every page.

## 5. Approvals: `/manager/approvals` (manager only)

Section pages in the top bar: **To approve (3)** · Write-off history (later).

```
ApprovalsView
├── ControlPanel
│   ├── SearchBox + FilterMenu       Search… · Filters ▾ (Damaged, Expired, Return to supplier)
│   └── "3 waiting"
├── LoadingState / ErrorState
├── EmptyState                       "Nothing to approve"
├── ApprovalTable
│   ├── ApprovalRow (×n)             ☐ · Date · Product (picture, name, SKU) · Reason · Quantity
│   │                                · In storage · Loss · Recorded by · Approve · Reject
│   └── total row                    total loss
└── RejectDialog                     opens on Reject
    ├── FormField  Reason (textarea)
    └── BaseButton Reject · Cancel
```

| Component | Props | Events | State |
|---|---|---|---|
| `ApprovalsView` | — | — | **Store**: pending movements, products, users. **Local**: `search`, `filters`, `rejectingId`, `busyId` |
| `ApprovalTable` | `rows: ApprovalRow[]`, `busyId` | `approve(id)`, `reject(id)` | **Local**: ticked rows (bulk approve, later) |
| `ApprovalRow` | `movement`, `product`, `recordedBy: User`, `busy` | `approve`, `reject` | — |
| `RejectDialog` | `open: boolean`, `busy: boolean` | `confirm(reason)`, `cancel` | **Local**: `reason`, error "Please give a reason for rejecting" |

Story 8: approving changes the stock; rejecting needs a reason. If the stock went down since the write-off was
recorded, approving shows "Not enough stock: only N left".

## 6. Not found

```
NotFoundView
└── EmptyState    "Page not found" + button back to your dashboard
```

The catch-all route `/:pathMatch(.*)*`. `ProductDetailView` also shows it when the product id does not exist.

## Where state lives: rule of thumb

- **In a store** when two or more pages need it, or when it must survive leaving the page: the logged-in user,
  products, categories and suppliers, movements, and the delivery being unpacked (`lastDelivery`).
- **Local in a component** when only that component uses it and it can be thrown away: typed form values,
  field errors, search text and filters, cards or list, the current page, an open menu or dialog.
- **In the URL** when a link should open the same thing: the product id (`/products/:id`) and "Low stock"
  (`/products?f=low`).
- **Props down, events up**: a child never changes a store or a prop itself. It emits an event, and the page
  (the view) talks to the store.
