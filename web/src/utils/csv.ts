// Build a CSV file in the browser and let the user save it (Export on Moves, Download on the report)

type Cell = string | number | null | undefined

// A cell with a comma, a quote or a new line goes in quotes, and its quotes are doubled
function cell(value: Cell) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: Cell[][]) {
  return rows.map((row) => row.map(cell).join(',')).join('\n')
}

export function downloadFile(filename: string, text: string, type = 'text/csv') {
  // A BOM (byte order mark) first makes Excel read the file as UTF-8, so the minus sign and Khmer names show correctly
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
