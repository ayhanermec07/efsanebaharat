// Fiyat görünürlüğü tek yerden yönetilir.
//
// Şu an dükkândaki toptan fiyatlar sisteme yüklü olduğu için fiyatlar yalnız
// onaylı bayilere, XML müşterilerine ve yöneticilere gösterilir. Perakende
// (internet) fiyatları hazır olduğunda PUBLIC_PRICES_ENABLED = true yapılması
// yeterlidir: herkese fiyat, sepet ve Google'a fiyat bilgisi geri açılır.
export const PUBLIC_PRICES_ENABLED = false

const PRICE_VIEWER_TYPES = new Set(['bayi', 'xml_musteri', 'admin'])

export function canSeePrices(options: { isAdmin?: boolean; musteriTipi?: string | null; publicPrices?: boolean }) {
  if (options.publicPrices ?? PUBLIC_PRICES_ENABLED) return true
  if (options.isAdmin) return true
  return PRICE_VIEWER_TYPES.has(String(options.musteriTipi || ''))
}
