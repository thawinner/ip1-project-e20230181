<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import InOutChart from '@/components/reports/InOutChart.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import ErrorState from '@/components/states/ErrorState.vue'
import { getMonthlyReport, type MonthlyReport } from '@/api/reports'
import { errorMessage } from '@/utils/errors'
import { formatDateTime, money, quantityText, reasonLabel, todayKey } from '@/utils/format'
import { downloadFile, toCsv } from '@/utils/csv'
import { useDropdown } from '@/composables/useDropdown'

// Story 9: stock in and out per category, the top 5 sent to the shop and the losses of one month.
// Only this page uses it, so the report stays local instead of going into a store.

// The last 12 months, newest first: "2026-11" → "November 2026"
const months = (() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: todayKey(d).slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  })
})()

const month = ref(months[0]!.value)
const report = ref<MonthlyReport | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const open = ref(new Set<number>()) // categories opened to show their products

async function load() {
  loading.value = true
  error.value = null
  try {
    report.value = await getMonthlyReport(month.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(month, load, { immediate: true })

const chartRows = computed(() => (report.value?.categories ?? []).map((c) => ({ label: c.category.name, in: c.in, out: c.out })))

function toggle(id: number) {
  const next = new Set(open.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  open.value = next
}

// "Damaged $7.20 · Return to supplier $45.60": losses added up by why they happened
const lossSummary = computed(() => {
  const byReason = new Map<string, number>()
  for (const l of report.value?.lossMoves ?? []) {
    const why = reasonLabel(l.movement)
    byReason.set(why, (byReason.get(why) ?? 0) + l.value)
  }
  return [...byReason.entries()].map(([why, value]) => `${why} ${money(value)}`).join(' · ')
})

// Download ▾: CSV (spreadsheet) or PDF (the browser's print window, "Save as PDF")
const downloadRoot = ref<HTMLElement | null>(null)
const downloadMenu = useDropdown(downloadRoot)
const monthLabel = computed(() => months.find((m) => m.value === month.value)?.label ?? month.value)

function downloadCsv() {
  downloadMenu.close()
  const r = report.value
  if (!r) return
  const rows: (string | number)[][] = [
    [`ShopStock monthly report, ${monthLabel.value}`],
    [],
    ['Total stock value (today, at cost price)', r.stockValue.toFixed(2)],
    ['Stock in (units)', r.stockIn],
    ['Stock out (units)', r.stockOut],
    ['Losses', r.losses.toFixed(2)],
    [],
    ['Category', 'In (units)', 'Out (units)', 'Losses'],
    ...r.categories.map((c) => [c.category.name, c.in, c.out, c.losses.toFixed(2)]),
    [],
    ['Most sent to the shop', 'SKU', 'Quantity'],
    ...r.topToShop.map((t) => [t.product.name, t.product.sku, t.quantity]),
    [],
    ['Loss date', 'Product', 'Why', 'Quantity', 'Value'],
    ...r.lossMoves.map((l) => [
      formatDateTime(l.movement.createdAt),
      l.product?.name ?? '',
      reasonLabel(l.movement),
      Math.abs(l.movement.change),
      l.value.toFixed(2),
    ]),
  ]
  downloadFile(`shopstock-report-${month.value}.csv`, toCsv(rows))
}

function printPdf() {
  downloadMenu.close()
  window.print()
}

const slowTotal = computed(() => (report.value?.slowMoving ?? []).reduce((sum, s) => sum + s.value, 0))
</script>

<template>
  <div class="page-band">
    <div class="page-band-inner">
      <h1 class="sr-only">Monthly report</h1>
      <label class="sr-only" for="report-month">Month</label>
      <select id="report-month" v-model="month" class="input month">
        <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <div ref="downloadRoot" class="download">
        <button
          type="button"
          class="btn btn-outline"
          aria-haspopup="menu"
          :aria-expanded="downloadMenu.open.value"
          :disabled="!report"
          @click="downloadMenu.toggle"
        >
          <AppIcon name="download" :size="16" /> Download <AppIcon name="caret" :size="14" />
        </button>
        <div v-if="downloadMenu.open.value" class="menu" role="menu">
          <button type="button" role="menuitem" @click="downloadCsv">CSV (spreadsheet)</button>
          <button type="button" role="menuitem" @click="printPdf">PDF (print)</button>
        </div>
      </div>
      <p class="print-title">ShopStock · Monthly report · {{ monthLabel }}</p>
    </div>
  </div>

  <div class="page" :aria-busy="loading">
    <ErrorState v-if="error" :message="error" @retry="load" />
    <section v-else-if="loading && !report" class="panel"><LoadingState message="Loading the report…" /></section>

    <template v-else-if="report">
      <div class="kpis" :class="{ dim: loading }">
        <div class="panel kpi">
          <span class="k">Total stock value</span>
          <b>{{ money(report.stockValue) }}</b>
          <span class="muted">At cost price, today</span>
        </div>
        <div class="panel kpi">
          <span class="k">Stock in</span>
          <b>{{ report.stockIn }} <small>units</small></b>
          <span class="muted">Deliveries and returns</span>
        </div>
        <div class="panel kpi">
          <span class="k">Stock out</span>
          <b>{{ report.stockOut }} <small>units</small></b>
          <span class="muted">To the shop and write-offs</span>
        </div>
        <div class="panel kpi">
          <span class="k">Losses</span>
          <b :class="{ loss: report.losses > 0 }">{{ money(report.losses) }}</b>
          <span class="muted">Write-offs and missing stock</span>
        </div>
      </div>

      <div class="two" :class="{ dim: loading }">
        <section class="panel">
          <h2 class="head">
            In and out by category
            <span class="legend" aria-hidden="true"><i class="in" /> In <i class="out" /> Out</span>
          </h2>
          <div class="chart-wrap"><InOutChart :rows="chartRows" /></div>
        </section>
        <section class="panel">
          <h2 class="head">Most sent to the shop</h2>
          <ol v-if="report.topToShop.length" class="top">
            <li v-for="(t, i) in report.topToShop" :key="t.product.id">
              <span class="rank">{{ i + 1 }}</span>
              <span class="thumb pic"><AppIcon name="box" :size="14" /></span>
              <RouterLink :to="`/products/${t.product.id}`" class="name">
                {{ t.product.name }}<span class="sku">{{ t.product.sku }}</span>
              </RouterLink>
              <b>{{ quantityText(t.quantity, t.product.unit) }}</b>
            </li>
          </ol>
          <p v-else class="none">Nothing was sent to the shop this month.</p>
        </section>
      </div>

      <section class="panel block" :class="{ dim: loading }">
        <h2 class="head">By category and product <span class="muted">Click a category to see its products</span></h2>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" class="num">In (units)</th>
                <th scope="col" class="num">Out (units)</th>
                <th scope="col" class="num">Losses</th>
              </tr>
            </thead>
            <tbody v-for="c in report.categories" :key="c.category.id">
              <tr class="cat">
                <th scope="row">
                  <button
                    v-if="c.products.length"
                    type="button"
                    class="fold"
                    :aria-expanded="open.has(c.category.id)"
                    @click="toggle(c.category.id)"
                  >
                    <AppIcon :name="open.has(c.category.id) ? 'caret' : 'chevronRight'" :size="16" />
                    {{ c.category.name }}
                  </button>
                  <span v-else class="fold plain">{{ c.category.name }}</span>
                </th>
                <td class="num">{{ c.in }}</td>
                <td class="num">{{ c.out }}</td>
                <td class="num" :class="{ loss: c.losses > 0 }">{{ money(c.losses) }}</td>
              </tr>
              <template v-if="open.has(c.category.id)">
                <tr v-for="p in c.products" :key="p.product.id" class="sub">
                  <td>
                    <RouterLink :to="`/products/${p.product.id}`">{{ p.product.name }}</RouterLink>
                  </td>
                  <td class="num">{{ p.in }}</td>
                  <td class="num">{{ p.out }}</td>
                  <td class="num" :class="{ loss: p.losses > 0 }">{{ money(p.losses) }}</td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td class="num"><b>{{ report.stockIn }}</b></td>
                <td class="num"><b>{{ report.stockOut }}</b></td>
                <td class="num"><b>{{ money(report.losses) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="panel block" :class="{ dim: loading }">
        <h2 class="head">Losses <span class="muted">{{ lossSummary }}</span></h2>
        <div v-if="report.lossMoves.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Product</th>
                <th scope="col">Why</th>
                <th scope="col" class="num">Quantity</th>
                <th scope="col" class="num">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in report.lossMoves" :key="l.movement.id">
                <td class="nowrap">
                  <RouterLink :to="`/moves/${l.movement.id}`">{{ formatDateTime(l.movement.createdAt) }}</RouterLink>
                </td>
                <td>{{ l.product?.name ?? `Product #${l.movement.productId}` }}</td>
                <td>
                  {{ reasonLabel(l.movement) }}
                  <small v-if="l.movement.note" class="note">{{ l.movement.note }}</small>
                </td>
                <td class="num">
                  {{ l.product ? quantityText(Math.abs(l.movement.change), l.product.unit) : Math.abs(l.movement.change) }}
                </td>
                <td class="num">{{ money(l.value) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="4">Total</th>
                <td class="num"><b>{{ money(report.losses) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-else class="none">No losses this month.</p>
      </section>

      <section class="panel block" :class="{ dim: loading }">
        <h2 class="head">Slow-moving <span class="muted">Not sent to the shop in 30 days</span></h2>
        <div v-if="report.slowMoving.length" class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" class="num">On hand</th>
                <th scope="col" class="num">Value at cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in report.slowMoving" :key="s.product.id">
                <td>
                  <RouterLink :to="`/products/${s.product.id}`" class="slow">
                    <span class="thumb pic"><AppIcon name="box" :size="14" /></span>
                    <span>{{ s.product.name }}<span class="sku">{{ s.product.sku }}</span></span>
                  </RouterLink>
                </td>
                <td class="num">{{ quantityText(s.product.quantity, s.product.unit) }}</td>
                <td class="num">{{ money(s.value) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colspan="2">Total</th>
                <td class="num"><b>{{ money(slowTotal) }}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p v-else class="none">Everything in storage went to the shop in the last 30 days.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.month {
  width: auto;
  min-width: 190px;
}

.download {
  position: relative;
}

.download .menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 200px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.download .menu button {
  display: block;
  width: 100%;
  min-height: 38px;
  padding: 6px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--ink-2);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.download .menu button:hover {
  background: var(--surface-2);
}

/* Printing (PDF): only the report, with its month as a title */
.print-title {
  display: none;
}

@media print {
  .month,
  .download {
    display: none;
  }

  .print-title {
    display: block;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
  }
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
}

.kpi .k {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
}

.kpi b {
  font-size: 26px;
  font-weight: 700;
  color: var(--ink);
}

.kpi b small {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}

.kpi .muted {
  font-size: 12px;
}

.loss,
.kpi b.loss {
  color: var(--danger-fg);
}

.two {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.block {
  margin-top: 16px;
  overflow: hidden;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--row);
  font-size: 15px;
}

.head .muted {
  font-size: 13px;
  font-weight: 400;
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-2);
}

.legend i {
  width: 10px;
  height: 10px;
  margin-left: 8px;
  border-radius: 2px;
}

.legend i.in {
  background: var(--chart-in);
}

.legend i.out {
  background: var(--chart-out);
}

.chart-wrap {
  padding: 12px 8px 8px;
}

.top {
  list-style: none;
  margin: 0;
  padding: 0;
}

.top li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--row);
}

.rank {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-hover);
  font-size: 13px;
  font-weight: 600;
}

.pic {
  width: 28px;
  height: 28px;
}

.name {
  flex: 1;
  min-width: 0;
  color: var(--ink);
  font-weight: 500;
  text-decoration: none;
}

.sku {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}

b {
  color: var(--ink);
  font-weight: 600;
}

.slow {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.fold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: none;
  color: var(--ink);
  font-weight: 600;
  cursor: pointer;
}

.fold.plain {
  padding-left: 22px;
  cursor: default;
}

.cat th {
  background: none;
  font-size: 14px;
}

.sub td:first-child {
  padding-left: 40px;
}

.note {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.nowrap {
  white-space: nowrap;
}

tfoot th,
tfoot td {
  background: var(--surface-2);
  border-bottom: 0;
}

tfoot th {
  color: var(--ink);
  text-align: left;
}

.none {
  margin: 0;
  padding: 20px 16px;
  color: var(--muted);
}

.dim {
  opacity: 0.6;
}

@media (max-width: 960px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
