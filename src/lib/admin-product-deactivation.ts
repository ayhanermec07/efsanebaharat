import type { supabase } from './supabase'

export async function deactivateProduct(client: typeof supabase, urunId: string): Promise<void> {
  const { data, error } = await client.functions.invoke('admin-product-save', {
    body: { action: 'deactivate', urunId }
  })
  if (error || data?.error) {
    throw new Error(data?.error?.message || error?.message || 'Ürün pasifleştirilemedi')
  }
}
