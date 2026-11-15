<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use, type ECharts } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'

// Only the parts of ECharts this chart uses, so the app stays small
use([BarChart, GridComponent, TooltipComponent, SVGRenderer])

export interface InOutRow {
  label: string
  in: number
  out: number
}

const props = defineProps<{ rows: InOutRow[] }>()

const el = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null

// Colours and fonts come from the design tokens in main.css
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// What a screen reader hears instead of the picture
const summary = computed(
  () => `Stock in and out by category: ${props.rows.map((r) => `${r.label} ${r.in} in, ${r.out} out`).join('; ')}`,
)

function series(name: string, key: 'in' | 'out', color: string) {
  return {
    name,
    type: 'bar' as const,
    data: props.rows.map((r) => r[key]),
    barWidth: 12,
    barGap: '20%',
    itemStyle: { color, borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right' as const, color: token('--ink-2'), fontSize: 12 },
    emphasis: { disabled: true },
  }
}

function draw() {
  if (!el.value) return
  el.value.style.height = `${props.rows.length * 52 + 16}px`
  chart ??= init(el.value, null, { renderer: 'svg' })
  chart.resize()
  chart.setOption(
    {
      animationDuration: 300,
      textStyle: { fontFamily: token('--font') },
      grid: { left: 4, right: 36, top: 4, bottom: 4, containLabel: true },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: token('--row') } },
        axisLabel: { color: token('--muted') },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: props.rows.map((r) => r.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: token('--border') } },
        axisLabel: { color: token('--ink'), fontSize: 13, fontWeight: 500 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: token('--surface'),
        borderColor: token('--border'),
        textStyle: { color: token('--ink') },
      },
      series: [series('In', 'in', token('--chart-in')), series('Out', 'out', token('--chart-out'))],
    },
    true,
  )
}

const onResize = () => chart?.resize()

onMounted(() => {
  draw()
  window.addEventListener('resize', onResize)
})
watch(() => props.rows, draw, { deep: true })
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="chart" role="img" :aria-label="summary" />
</template>

<style scoped>
.chart {
  width: 100%;
  padding: 0 8px;
}
</style>
