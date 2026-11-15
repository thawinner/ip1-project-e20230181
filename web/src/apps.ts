import type { Role } from '@/types'
import type { IconName } from '@/components/icons'

// The home menu and the top bar are built from this list, filtered by role.

export type AppId =
  | 'today'
  | 'products'
  | 'moves'
  | 'approvals'
  | 'reorder'
  | 'report'
  | 'staff'
  | 'categories'
  | 'suppliers'
  | 'profile'

// Which number to show next to an app or a page
export type CountKey = 'pending' | 'low' | 'rejected'

export interface AppPage {
  label: string
  path: string
  query?: Record<string, string>
  count?: CountKey
}

export interface AppDef {
  id: AppId
  label: string
  section?: string // name in the top bar when it differs from the tile (Categories → "Settings")
  icon: IconName
  to: string
  count?: CountKey
  pages: AppPage[]
}

const today: AppDef = {
  id: 'today',
  label: 'Today',
  icon: 'clock',
  to: '/dashboard',
  pages: [{ label: 'Today', path: '/dashboard' }],
}

const products: AppDef = {
  id: 'products',
  label: 'Products',
  icon: 'box',
  to: '/products',
  pages: [
    { label: 'All products', path: '/products' },
    { label: 'Low stock', path: '/products', query: { stock: 'low' } },
  ],
}

// Categories and suppliers are two tiles but one "Settings" section in the top bar
const settingsPages: AppPage[] = [
  { label: 'Categories', path: '/settings/categories' },
  { label: 'Suppliers', path: '/settings/suppliers' },
]

const profile: AppDef = {
  id: 'profile',
  label: 'My profile',
  icon: 'user',
  to: '/profile',
  pages: [{ label: 'My profile', path: '/profile' }],
}

export function appsFor(role: Role): AppDef[] {
  if (role === 'STAFF') {
    return [
      today,
      products,
      // The same /moves pages as the manager's Moves; a storekeeper gets only their own moves
      {
        id: 'moves',
        label: 'My moves',
        icon: 'list',
        to: '/moves',
        count: 'rejected',
        pages: [
          { label: 'All my moves', path: '/moves' },
          { label: 'Waiting', path: '/moves', query: { status: 'pending' } },
          { label: 'Rejected', path: '/moves', query: { status: 'rejected' }, count: 'rejected' },
        ],
      },
      profile,
    ]
  }
  return [
    today,
    products,
    {
      id: 'moves',
      label: 'Moves',
      icon: 'arrows',
      to: '/moves',
      pages: [
        { label: 'All moves', path: '/moves' },
        { label: 'Deliveries', path: '/moves', query: { reason: 'delivery' } },
        { label: 'Write-offs', path: '/moves', query: { reason: 'writeoff' } },
      ],
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: 'check',
      to: '/approvals',
      count: 'pending',
      pages: [
        { label: 'To approve', path: '/approvals', count: 'pending' },
        { label: 'Write-off history', path: '/approvals/history' },
      ],
    },
    {
      id: 'reorder',
      label: 'Reorder',
      icon: 'bell',
      to: '/reorder',
      count: 'low',
      pages: [
        { label: 'Reorder list', path: '/reorder', count: 'low' },
        { label: 'Low stock products', path: '/products', query: { stock: 'low' } },
      ],
    },
    {
      id: 'report',
      label: 'Report',
      icon: 'chart',
      to: '/reports/monthly',
      pages: [
        { label: 'Monthly report', path: '/reports/monthly' },
        { label: 'Moves by product', path: '/reports/moves-by-product' },
      ],
    },
    {
      id: 'staff',
      label: 'Staff accounts',
      icon: 'users',
      to: '/staff',
      pages: [{ label: 'Staff accounts', path: '/staff' }],
    },
    { id: 'categories', label: 'Categories', icon: 'tag', to: '/settings/categories', section: 'Settings', pages: settingsPages },
    { id: 'suppliers', label: 'Suppliers', icon: 'truck', to: '/settings/suppliers', section: 'Settings', pages: settingsPages },
    profile,
  ]
}
