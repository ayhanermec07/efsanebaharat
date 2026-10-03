export const MANAGEMENT_PAGE_SIZE = 25

export function managementSearchPattern(search: string): string | null {
  const value = search.trim().slice(0, 100).replace(/[\\%_]/g, '\\$&')
  return value ? `%${value}%` : null
}

export function managementPageRange(page: number) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const from = (safePage - 1) * MANAGEMENT_PAGE_SIZE
  return { from, to: from + MANAGEMENT_PAGE_SIZE - 1 }
}
