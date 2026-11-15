import type { MovementStatus, Reason, StockMovement, Unit } from '@/types'

const REASON_LABELS: Record<Reason, string> = {
  PURCHASE: 'Delivery', // shown as "Delivery"; the code stays PURCHASE like in the proposal
  RETURN_FROM_SHOP: 'Return from shop',
  TO_SHOP: 'To the shop',
  DAMAGED: 'Damaged',
  EXPIRED: 'Expired',
  RETURN_TO_SUPPLIER: 'Return to supplier',
}

const UNIT_LABELS: Record<Unit, [string, string]> = {
  CASE: ['case', 'cases'],
  BOX: ['box', 'boxes'],
  BAG: ['bag', 'bags'],
  PACK: ['pack', 'packs'],
  PIECE: ['piece', 'pieces'],
}

const STATUS_LABELS: Record<MovementStatus, string> = {
  APPLIED: 'Applied',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
}

export function reasonLabel(movement: Pick<StockMovement, 'reason'>) {
  return movement.reason ? REASON_LABELS[movement.reason] : 'Stock count'
}

// "012345678" → "012 345 678", "0975556666" → "097 555 6666"
export function formatPhone(phone: string) {
  return phone.replace(/\s/g, '').replace(/^(\d{3})(\d{3})(\d+)$/, '$1 $2 $3')
}

export function unitWord(quantity: number, unit: Unit) {
  const [one, many] = UNIT_LABELS[unit]
  return Math.abs(quantity) === 1 ? one : many
}

// "12 cases"
export function quantityText(quantity: number, unit: Unit) {
  return `${quantity} ${unitWord(quantity, unit)}`
}

// "−2 packs", "+12 cases"
export function changeText(change: number, unit: Unit) {
  return `${signed(change)} ${unitWord(change, unit)}`
}

export function unitLabel(unit: Unit) {
  return UNIT_LABELS[unit][0]
}

export function statusLabel(status: MovementStatus) {
  return STATUS_LABELS[status]
}

// Real minus sign, like "−2"
export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : '0'
}

// Dates in the API are local times without a time zone ("2026-11-08T08:45:00")
export function todayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function isToday(iso: string) {
  return iso.slice(0, 10) === todayKey()
}

export function formatDateTime(iso: string) {
  // "Nov 6, 10:34"
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

// "Sun, Oct 25, 2026 · 15:40"
export function formatFullDateTime(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  return `${day} · ${formatTime(iso)}`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function formatLongDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// "$1,258.80", "−$3.60"
export function money(n: number) {
  const text = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `\u2212$${text}` : `$${text}`
}
