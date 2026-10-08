import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogCategory } from './catalog'

export interface CategoryNode {
  category: CatalogCategory
  children: CategoryNode[]
}

function compareCategories(a: CatalogCategory, b: CatalogCategory) {
  return (a.sira_no || 0) - (b.sira_no || 0) || a.kategori_adi.localeCompare(b.kategori_adi, 'tr') || a.id.localeCompare(b.id)
}

export function buildCategoryTree(categories: CatalogCategory[]): CategoryNode[] {
  const sorted = [...categories].sort(compareCategories)
  const ids = new Set(categories.map(category => category.id))
  const children = new Map<string, CatalogCategory[]>()
  for (const category of sorted) {
    const parent = category.ust_kategori_id || ''
    children.set(parent, [...(children.get(parent) || []), category])
  }
  const visited = new Set<string>()
  function visit(category: CatalogCategory): CategoryNode {
    visited.add(category.id)
    return { category, children: (children.get(category.id) || []).filter(child => !visited.has(child.id)).map(visit) }
  }
  const roots = sorted.filter(category => !category.ust_kategori_id || !ids.has(category.ust_kategori_id))
  const tree = roots.map(visit)
  // Eski döngülü/eksik ilişkiler gezinmeyi kilitlememeli veya kategoriyi gizlememeli.
  for (const category of sorted) {
    if (!visited.has(category.id)) tree.push(visit(getCategoryPath(categories, category.id)[0]))
  }
  return tree
}

export function getCategoryPath(categories: CatalogCategory[], id: string): CatalogCategory[] {
  const byId = new Map(categories.map(category => [category.id, category]))
  const path: CatalogCategory[] = []
  const visited = new Set<string>()
  let category = byId.get(id)
  while (category && !visited.has(category.id)) {
    path.unshift(category)
    visited.add(category.id)
    category = byId.get(category.ust_kategori_id || '')
  }
  if (category) {
    const cycleEnd = path.findIndex(parent => parent.id === category.id)
    const root = path.slice(0, cycleEnd + 1).sort(compareCategories)[0]
    return path.slice(path.findIndex(parent => parent.id === root.id))
  }
  return path
}

export function getCategoryBranchIds(categories: CatalogCategory[], id: string): Set<string> {
  const ids = new Set([id])
  for (const parent of ids) {
    for (const category of categories) if (category.ust_kategori_id === parent) ids.add(category.id)
  }
  return ids
}

// PostgREST'in varsayılan satır sınırı alt kategorileri kesmemeli.
export async function loadCategories(client: SupabaseClient, activeOnly: boolean): Promise<CatalogCategory[]> {
  const categories: CatalogCategory[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from('kategoriler').select('id,kategori_adi,ust_kategori_id,sira_no,aciklama,banner_desktop_url,banner_mobile_url,urun_detay_temasi,banner_temasi').order('id')
    if (activeOnly) query = query.eq('aktif_durum', true)
    const { data, error } = await query.range(offset, offset + pageSize - 1)
    if (error) throw error
    categories.push(...(data || []))
    if (!data || data.length < pageSize) return categories
  }
}
