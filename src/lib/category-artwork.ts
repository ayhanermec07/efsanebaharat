import type { CatalogCategory } from './catalog'

export const CATEGORY_THEMES = [
  ['spice', 'Baharat'], ['oil', 'Yağ'], ['soap', 'Sabun'], ['delight', 'Lokum'],
  ['water', 'Bitki suyu'], ['paste', 'Macun'], ['essence', 'Esans'], ['color', 'Gıda boyası'],
  ['cream', 'Krem'], ['molasses', 'Pekmez'], ['vinegar', 'Sirke'], ['shampoo', 'Şampuan'], ['salt', 'Tuz'],
] as const
export type ThemeKey = (typeof CATEGORY_THEMES)[number][0] | 'plain'
export type ThemeField = 'urun_detay_temasi' | 'banner_temasi'

export function resolveCategoryTheme(categories: CatalogCategory[], id: string | null | undefined, field: ThemeField): ThemeKey {
  const byId = new Map(categories.map(category => [category.id, category]))
  const visited = new Set<string>()
  let category = byId.get(id || '')
  while (category && !visited.has(category.id)) {
    visited.add(category.id)
    const value = category[field]
    if (value != null) return CATEGORY_THEMES.some(([key]) => key === value) ? value as ThemeKey : 'plain'
    category = byId.get(category.ust_kategori_id || '')
  }
  return 'plain'
}

export function hasCategoryTheme(categories: CatalogCategory[], id: string, field: ThemeField): boolean {
  const byId = new Map(categories.map(category => [category.id, category]))
  const visited = new Set<string>()
  let category = byId.get(id)
  while (category && !visited.has(category.id)) {
    visited.add(category.id)
    if (category[field] != null) return true
    category = byId.get(category.ust_kategori_id || '')
  }
  return false
}
