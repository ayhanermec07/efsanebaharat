export const TAXONOMY_PAGE_SIZE = 25

export function taxonomySearchPattern(search: string): string | null {
  const value = search.trim().slice(0, 100).replace(/[\\%_]/g, '\\$&')
  return value ? `%${value}%` : null
}

export function taxonomyPageRange(page: number) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const from = (safePage - 1) * TAXONOMY_PAGE_SIZE
  return { from, to: from + TAXONOMY_PAGE_SIZE - 1 }
}
