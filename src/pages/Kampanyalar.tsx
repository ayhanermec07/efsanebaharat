import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Calendar, PackageSearch, Percent, RotateCcw, Tag } from 'lucide-react'
import UrunKart from '../components/UrunKart'
import { useAuth } from '../contexts/AuthContext'
import { loadPublicCatalog, type CatalogProduct } from '../lib/catalog'
import { supabase } from '../lib/supabase'

interface Kampanya {
  id: string
  kod: string
  ad: string
  aciklama: string
  indirim_tipi: 'yuzde' | 'tutar'
  indirim_degeri: number
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  kapsam: 'tum_urunler' | 'kategori' | 'marka' | 'secili_urunler'
  kategori_id?: string
  marka_id?: string
}

interface KampanyaWithProducts extends Kampanya {
  urunler: CatalogProduct[]
  toplam: number
}

export default function Kampanyalar() {
  const { user, musteriData } = useAuth()
  const [kampanyalar, setKampanyalar] = useState<KampanyaWithProducts[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadKampanyalarWithProducts = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)

      const now = new Date().toISOString()
      const { data: kampanyalarData, error: kampanyalarError } = await supabase
        .from('kampanyalar')
        .select('*')
        .eq('aktif', true)
        .lte('baslangic_tarihi', now)
        .gte('bitis_tarihi', now)
        .neq('kapsam', 'tum_urunler')
        .order('olusturma_tarihi', { ascending: false })

      if (kampanyalarError) throw kampanyalarError
      if (!kampanyalarData || kampanyalarData.length === 0) {
        setKampanyalar([])
        return
      }

      // Kapsam, satış satırı grubu ve kampanyanın hedef grubu sunucuda uygulanır;
      // her kampanya için tek katalog isteği yapılır.
      const pages = await Promise.all(
        kampanyalarData.map((kampanya) => loadPublicCatalog({ kampanya: kampanya.id, limit: 12 }))
      )
      const kampanyalarWithProducts: KampanyaWithProducts[] = kampanyalarData
        .map((kampanya, index) => ({ ...kampanya, urunler: pages[index].urunler, toplam: pages[index].toplam }))
        .filter((kampanya, index) => !pages[index].kampanyaGecersiz && kampanya.urunler.length > 0)

      setKampanyalar(kampanyalarWithProducts)
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error)
      setKampanyalar([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Oturum/müşteri tipi değişince bayi fiyatı yeniden yetkilendirilerek alınır.
  const viewerKey = `${user?.id || 'anon'}:${musteriData?.musteri_tipi || ''}`
  useEffect(() => {
    loadKampanyalarWithProducts()
  }, [loadKampanyalarWithProducts, viewerKey])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="shop-page-heading mb-6">
        <div className="shop-eyebrow">
          <Tag className="h-4 w-4" />
          Fırsatlar
        </div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Kampanyalı ürünler</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">
          Aktif indirimler ve avantajlı ürün rafları burada listelenir.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-red-200 bg-white p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600" />
          <h2 className="mt-3 text-xl font-bold text-zinc-950">Kampanyalar yüklenemedi</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Bağlantıyı kontrol edip tekrar deneyin.</p>
          <button type="button" onClick={loadKampanyalarWithProducts} className="mt-5 flex min-h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-white"><RotateCcw className="h-4 w-4" />Tekrar dene</button>
        </div>
      ) : kampanyalar.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
          <PackageSearch className="h-12 w-12 text-brand-muted" />
          <h2 className="mt-3 text-xl font-bold text-zinc-950">Aktif kampanya yok</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Yeni kampanyalar eklendiğinde burada görünür.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {kampanyalar.map((kampanya) => (
            <section key={kampanya.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-orange-50 p-4 sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-[30px] items-center gap-1 rounded-full bg-red-600 px-3 text-xs font-bold text-white">
                        <Percent className="h-4 w-4" />
                        {kampanya.indirim_tipi === 'yuzde' ? `%${kampanya.indirim_degeri} indirim` : `${kampanya.indirim_degeri} TL indirim`}
                      </span>
                      {kampanya.kod && (
                        <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold text-orange-700">
                          {kampanya.kod}
                        </span>
                      )}
                    </div>
                    <h2 className="break-words text-2xl font-bold text-zinc-950">{kampanya.ad}</h2>
                    {kampanya.aciklama && <p className="mt-1 text-sm leading-6 text-zinc-600">{kampanya.aciklama}</p>}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:flex-col md:items-end">
                    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs font-bold text-zinc-600">
                      <Calendar className="h-4 w-4 shrink-0 text-orange-700" />
                      <span className="break-words">{formatDate(kampanya.baslangic_tarihi)} - {formatDate(kampanya.bitis_tarihi)}</span>
                    </div>
                    {kampanya.toplam > kampanya.urunler.length && (
                      <Link
                        to={`/urunler?kampanya=${kampanya.id}`}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Tümünü gör ({kampanya.toplam})
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {kampanya.urunler.map((urun) => (
                  <UrunKart
                    key={urun.id}
                    urun={urun}
                    kampanya={{
                      indirim_tipi: kampanya.indirim_tipi,
                      indirim_degeri: kampanya.indirim_degeri
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
