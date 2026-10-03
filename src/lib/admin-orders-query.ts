export const ORDER_PAGE_SIZE = 25

type Filters = { search: string; status: string; from: string; to: string }

const statuses = new Set([
  'beklemede', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal_edildi',
  'odeme_bekleniyor', 'iptal', 'Yeni'
])

function istanbulDay(day: string, next: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const start = new Date(`${day}T00:00:00+03:00`)
  if (Number.isNaN(start.getTime()) || new Date(start.getTime() + 3 * 3600000).toISOString().slice(0, 10) !== day) return null
  return new Date(start.getTime() + (next ? 86400000 : 0)).toISOString()
}

export function orderQueryFilters(filters: Filters) {
  const search = filters.search.trim().replace(/^#/, '').trim().slice(0, 50)
  const escaped = search.replace(/[\\%_]/g, '\\$&')
  return {
    searchPattern: escaped ? `%${escaped}%` : null,
    status: statuses.has(filters.status) ? filters.status : null,
    from: istanbulDay(filters.from, false),
    until: istanbulDay(filters.to, true)
  }
}

export function orderPageRange(page: number) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const from = (safePage - 1) * ORDER_PAGE_SIZE
  return { from, to: from + ORDER_PAGE_SIZE - 1 }
}
