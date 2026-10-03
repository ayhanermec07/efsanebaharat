import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadCustomerOrders(client: Pick<SupabaseClient, 'from'>, customerId: string) {
  const { data: orders, error: orderError } = await client
    .from('siparisler')
    .select('*')
    .eq('musteri_id', customerId)
    .order('olusturma_tarihi', { ascending: false })
  if (orderError) throw orderError
  if (!orders?.length) return []

  const { data: lines, error: lineError } = await client
    .from('siparis_urunleri')
    .select('*')
    .in('siparis_id', orders.map(order => order.id))
  if (lineError) throw lineError

  const productIds = [...new Set((lines || []).map(line => line.urun_id).filter(Boolean))]
  let productNames = new Map<string, string>()
  if (productIds.length) {
    const { data: products, error: productError } = await client
      .from('urunler')
      .select('id, urun_adi')
      .in('id', productIds)
    if (productError) throw productError
    productNames = new Map((products || []).map(product => [product.id, product.urun_adi]))
  }

  const linesByOrder = new Map<string, typeof lines>()
  for (const line of lines || []) {
    const group = linesByOrder.get(line.siparis_id) || []
    group.push({ ...line, urun_adi: productNames.get(line.urun_id) || 'Ürün' })
    linesByOrder.set(line.siparis_id, group)
  }
  return orders.map(order => ({ ...order, siparis_urunleri: linesByOrder.get(order.id) || [] }))
}
