import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, PackageSearch, RotateCcw, Star } from 'lucide-react'
import UrunKart from '../components/UrunKart'
import CatalogToolbar from '../components/CatalogToolbar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchInBatches } from '../utils/supabaseBatch'
import CategoryArtwork from '../components/CategoryArtwork'

export default function EnCokSatan() {
  const { musteriData } = useAuth()
  const [urunler, setUrunler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [siralama, setSiralama] = useState<'otomatik' | 'manuel'>('otomatik')
  const [loadError, setLoadError] = useState(false)

  const fetchProductDetails = useCallback(async (
    urunIds: string[],
    satisSayilari?: { [key: string]: number }
  ) => {
    const { data: urunlerData, error: urunlerError } = await supabase
      .from('urunler')
      .select('*')
      .in('id', urunIds)
      .eq('aktif_durum', true)

    if (urunlerError) throw urunlerError
    if (!urunlerData || urunlerData.length === 0) {
      setUrunler([])
      return
    }

    const ids = urunlerData.map(u => u.id)
    const kategoriIds = [...new Set(urunlerData.map(u => u.kategori_id).filter(Boolean))]
    const markaIds = [...new Set(urunlerData.map(u => u.marka_id).filter(Boolean))]

    const [{ data: kategoriler }, { data: markalar }, { data: stoklar }, { data: gorseller }] = await Promise.all([
      fetchInBatches(kategoriIds, batchIds =>
        supabase.from('kategoriler').select('id, kategori_adi').in('id', batchIds)
      ),
      fetchInBatches(markaIds, batchIds =>
        supabase.from('markalar').select('id, marka_adi').in('id', batchIds)
      ),
      fetchInBatches(ids, batchIds =>
        supabase.from('urun_stoklari').select('*').in('urun_id', batchIds).eq('aktif_durum', true)
      ),
      fetchInBatches(ids, batchIds =>
        supabase.from('urun_gorselleri').select('*').in('urun_id', batchIds).order('sira_no')
      )
    ])

    const musteriTipi = musteriData?.musteri_tipi || 'musteri'
    const list = urunlerData.map(urun => {
      const urunStoklari = stoklar?.filter(s => s.urun_id === urun.id) || []
      const filtreliStoklar = urunStoklari.filter(s =>
        !s.stok_grubu || s.stok_grubu === 'hepsi' || s.stok_grubu === musteriTipi
      )

      return {
        ...urun,
        satis_sayisi: satisSayilari?.[urun.id] || 0,
        urun_stoklari: filtreliStoklar,
        urun_gorselleri: gorseller?.filter(g => g.urun_id === urun.id) || [],
        kategoriler: kategoriler?.find(k => k.id === urun.kategori_id),
        markalar: markalar?.find(m => m.id === urun.marka_id)
      }
    })

    if (satisSayilari) {
      list.sort((a, b) => (b.satis_sayisi || 0) - (a.satis_sayisi || 0))
    }

    setUrunler(list)
  }, [musteriData?.musteri_tipi])

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)

      if (siralama === 'manuel') {
        const { data: onerilen, error: onerilenError } = await supabase
          .from('onerilen_urunler')
          .select('urun_id, goruntuleme_sirasi')
          .eq('manuel_secim', true)
          .order('goruntuleme_sirasi', { ascending: true })

        if (onerilenError) throw onerilenError
        if (onerilen && onerilen.length > 0) {
          await fetchProductDetails(onerilen.map(o => o.urun_id))
        } else {
          setUrunler([])
        }
      } else {
        const { data: satislar, error: satisError } = await supabase
          .rpc('popular_product_summary', { p_limit: 12 })

        if (satisError) throw satisError

        const satisSayilari: { [key: string]: number } = {}
        satislar?.forEach(satis => {
          satisSayilari[satis.urun_id] = Number(satis.satis_sayisi || 0)
        })
        const enCokSatanIds = satislar?.map(satis => satis.urun_id) || []

        if (enCokSatanIds.length > 0) {
          await fetchProductDetails(enCokSatanIds, satisSayilari)
        } else {
          const { data: aktifUrunler } = await supabase
            .from('urunler')
            .select('id')
            .eq('aktif_durum', true)
            .limit(12)

          if (aktifUrunler && aktifUrunler.length > 0) {
            await fetchProductDetails(aktifUrunler.map(u => u.id))
          } else {
            setUrunler([])
          }
        }
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
      setUrunler([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [fetchProductDetails, siralama])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return (
    <div className="min-w-0">
      <CatalogToolbar>
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-xs font-semibold sm:text-sm">En çok satanlar</span>
          <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-brand-paper p-1">
            <button
              type="button"
              onClick={() => setSiralama('otomatik')}
              className={`min-h-[40px] rounded-md px-2 text-sm sm:px-4 font-bold transition ${siralama === 'otomatik' ? 'bg-brand text-white' : 'text-brand-muted'}`}
            >
              Otomatik
            </button>
            <button
              type="button"
              onClick={() => setSiralama('manuel')}
              className={`flex min-h-[40px] items-center justify-center gap-2 rounded-md px-2 text-sm sm:px-4 font-bold transition ${siralama === 'manuel' ? 'bg-brand text-white' : 'text-brand-muted'}`}
            >
              <Star className="h-4 w-4" />
              Önerilen
            </button>
          </div>
        </div>
      </CatalogToolbar>
      <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="bestseller-art-heading mb-6 flex min-w-0 items-center justify-between gap-3 border-b border-brand-line pb-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">En çok satanlar</h1>
          <p className="mt-2 text-xs leading-5 text-brand-muted sm:text-sm">
            {siralama === 'otomatik' ? 'Satış verilerine göre öne çıkan ürünler.' : 'Panelden özel seçilmiş ürünler.'}
          </p>
        </div>
        <CategoryArtwork theme="spice" part="upper" className="bestseller-heading-art" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-red-200 bg-white p-6 text-center">
          <AlertCircle className="h-12 w-12 text-brand-secondary" />
          <h2 className="mt-3 text-xl font-bold text-zinc-950">Ürünler yüklenemedi</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Bağlantıyı kontrol edip tekrar deneyin.</p>
          <button type="button" onClick={loadProducts} className="mt-5 flex min-h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-white"><RotateCcw className="h-4 w-4" />Tekrar dene</button>
        </div>
      ) : urunler.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
          <PackageSearch className="h-12 w-12 text-brand-muted" />
          <h2 className="mt-3 text-xl font-bold text-zinc-950">Henüz ürün yok</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">Bu raf için gösterilecek ürün bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {urunler.map((urun) => (
            <UrunKart key={urun.id} urun={urun} />
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
