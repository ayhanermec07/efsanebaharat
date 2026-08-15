import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react'
import UrunKart from '../components/UrunKart'
import { useAuth } from '../contexts/AuthContext'
import { publicSupabase } from '../lib/supabase'
import {
  getMatchingBrandIds,
  getMatchingCategoryIds,
  sanitizePostgrestSearchTerm,
  scoreProductRelevance,
} from '../utils/categorySearch'
import { fetchInBatches } from '../utils/supabaseBatch'

const INITIAL_PRODUCT_LIMIT = 48

export default function Urunler() {
  const { musteriData } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [urunler, setUrunler] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [visibleProductLimit, setVisibleProductLimit] = useState(INITIAL_PRODUCT_LIMIT)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [aramaText, setAramaText] = useState(searchParams.get('q') || '')
  const [secilenKategori, setSecilenKategori] = useState(searchParams.get('kategori') || '')
  const [secilenMarka, setSecilenMarka] = useState(searchParams.get('marka') || '')
  const [secilenKampanya, setSecilenKampanya] = useState(searchParams.get('kampanya') || '')
  const [activeCampaign, setActiveCampaign] = useState<any>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const latestLoadRequestRef = useRef(0)

  const syncSearchParams = useCallback((nextValues: { q?: string; kategori?: string; marka?: string; kampanya?: string }) => {
    const nextParams = new URLSearchParams(searchParams)

    if (nextValues.q !== undefined) {
      const trimmed = nextValues.q.trim()
      if (trimmed) {
        nextParams.set('q', trimmed)
      } else {
        nextParams.delete('q')
      }
    }

    if (nextValues.kategori !== undefined) {
      if (nextValues.kategori) {
        nextParams.set('kategori', nextValues.kategori)
      } else {
        nextParams.delete('kategori')
      }
    }

    if (nextValues.marka !== undefined) {
      if (nextValues.marka) {
        nextParams.set('marka', nextValues.marka)
      } else {
        nextParams.delete('marka')
      }
    }

    if (nextValues.kampanya !== undefined) {
      if (nextValues.kampanya) {
        nextParams.set('kampanya', nextValues.kampanya)
      } else {
        nextParams.delete('kampanya')
      }
    }

    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    loadKategoriler()
    loadMarkalar()
  }, [])

  useEffect(() => {
    const kategoriParam = searchParams.get('kategori')
    const markaParam = searchParams.get('marka')
    const kampanyaParam = searchParams.get('kampanya')
    const qParam = searchParams.get('q')

    setSecilenKategori(kategoriParam || '')
    setSecilenMarka(markaParam || '')
    setSecilenKampanya(kampanyaParam || '')
    setAramaText(qParam || '')
  }, [searchParams])

  async function loadKategoriler() {
    const { data } = await publicSupabase
      .from('kategoriler')
      .select('*')
      .eq('aktif_durum', true)
      .order('kategori_adi')

    if (data) setKategoriler(data)
  }

  async function loadMarkalar() {
    const { data } = await publicSupabase
      .from('markalar')
      .select('*')
      .eq('aktif_durum', true)
      .order('marka_adi')

    if (data) setMarkalar(data)
  }

  const loadUrunler = useCallback(async () => {
    const requestId = ++latestLoadRequestRef.current
    const isLatestRequest = () => latestLoadRequestRef.current === requestId

    setLoading(true)
    setLoadError(null)
    let query = publicSupabase
      .from('urunler')
      .select('*')
      .eq('aktif_durum', true)

    const searchTerm = aramaText.trim()
    const matchingCategoryIds = searchTerm ? getMatchingCategoryIds(kategoriler, searchTerm) : []
    const matchingBrandIds = searchTerm ? getMatchingBrandIds(markalar, searchTerm) : []

    if (secilenKategori) query = query.eq('kategori_id', secilenKategori)
    if (secilenMarka) query = query.eq('marka_id', secilenMarka)

    if (searchTerm) {
      const safeSearchTerm = sanitizePostgrestSearchTerm(searchTerm)
      const searchFilters = [`urun_adi.ilike.%${safeSearchTerm}%`]

      if (matchingCategoryIds.length > 0) {
        searchFilters.push(`kategori_id.in.(${matchingCategoryIds.join(',')})`)
      }

      if (matchingBrandIds.length > 0) {
        searchFilters.push(`marka_id.in.(${matchingBrandIds.join(',')})`)
      }

      query = query.or(searchFilters.join(','))
    }

    try {
      if (secilenKampanya) {
      const { data: camp } = await publicSupabase
        .from('kampanyalar')
        .select('*')
        .eq('id', secilenKampanya)
        .single()

      if (camp) {
        if (!isLatestRequest()) return
        setActiveCampaign(camp)

        if (camp.kapsam === 'secili_urunler') {
          const { data: pids } = await publicSupabase
            .from('kampanya_urunler')
            .select('urun_id')
            .eq('kampanya_id', secilenKampanya)

          const ids = pids?.map(p => p.urun_id) || []
          query = ids.length > 0
            ? query.in('id', ids)
            : query.eq('id', '00000000-0000-0000-0000-000000000000')
        } else if (camp.kapsam === 'kategori' && camp.kategori_id) {
          query = query.eq('kategori_id', camp.kategori_id)
        } else if (camp.kapsam === 'marka' && camp.marka_id) {
          query = query.eq('marka_id', camp.marka_id)
        }
      }
      } else if (isLatestRequest()) {
        setActiveCampaign(null)
      }

      const requestTimeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Ürün listesi zamanında yüklenemedi.')), 20_000)
      })
      let { data } = await Promise.race([
        query.order('urun_adi').limit(visibleProductLimit),
        requestTimeout
      ])

      if (!isLatestRequest()) return

      if (!data || data.length === 0) {
        setUrunler([])
        setHasMoreProducts(false)
        return
      }

      setHasMoreProducts(data.length === visibleProductLimit)

      if (searchTerm) {
        data = data.filter(
          (p) =>
            scoreProductRelevance(p, searchTerm) > 0 ||
            matchingCategoryIds.includes(p.kategori_id) ||
            matchingBrandIds.includes(p.marka_id)
        )
        data.sort((a, b) => scoreProductRelevance(b, searchTerm) - scoreProductRelevance(a, searchTerm))
      }

      const urunIds = data.map(u => u.id)
      const kategoriIds = [...new Set(data.map(u => u.kategori_id).filter(Boolean))]
      const markaIds = [...new Set(data.map(u => u.marka_id).filter(Boolean))]

      const [
      { data: gorseller, error: gorsellerError },
      { data: stoklar, error: stoklarError },
      { data: kategorilerData },
      { data: markalarData }
      ] = await Promise.all([
      fetchInBatches(urunIds, ids =>
        publicSupabase.from('urun_gorselleri').select('*').in('urun_id', ids).order('sira_no')
      ),
      fetchInBatches(urunIds, ids =>
        publicSupabase.from('urun_stoklari').select('*').in('urun_id', ids).eq('aktif_durum', true)
      ),
      fetchInBatches(kategoriIds, ids =>
        publicSupabase.from('kategoriler').select('id, kategori_adi').in('id', ids)
      ),
      fetchInBatches(markaIds, ids =>
        publicSupabase.from('markalar').select('id, marka_adi').in('id', ids)
      )
      ])

      if (!isLatestRequest()) return

      if (gorsellerError) console.error('Ürün görselleri yükleme hatası:', gorsellerError)
      if (stoklarError) console.error('Ürün stokları yükleme hatası:', stoklarError)

      const musteriTipi = musteriData?.musteri_tipi || 'musteri'

      const urunlerWithData = data.map(urun => {
      const urunStoklari = stoklar?.filter(s => s.urun_id === urun.id) || []
      const filtreliStoklar = urunStoklari.filter(s =>
        !s.stok_grubu || s.stok_grubu === 'hepsi' || s.stok_grubu === musteriTipi
      )

      return {
        ...urun,
        urun_gorselleri: gorseller?.filter(g => g.urun_id === urun.id) || [],
        urun_stoklari: filtreliStoklar,
        kategoriler: kategorilerData?.find(k => k.id === urun.kategori_id),
        markalar: markalarData?.find(m => m.id === urun.marka_id)
      }
      })

      setUrunler(urunlerWithData)
    } catch (error) {
      console.error('Ürün yükleme hatası:', error)
      if (isLatestRequest()) {
        setUrunler([])
        setLoadError('Ürünler şu anda yüklenemedi. Lütfen tekrar deneyin.')
      }
    } finally {
      if (isLatestRequest()) setLoading(false)
    }
  }, [aramaText, kategoriler, markalar, musteriData?.musteri_tipi, secilenKampanya, secilenKategori, secilenMarka, visibleProductLimit])

  useEffect(() => {
    loadUrunler()
  }, [loadUrunler])

  const clearFilters = () => {
    setVisibleProductLimit(INITIAL_PRODUCT_LIMIT)
    setSecilenKategori('')
    setSecilenMarka('')
    setAramaText('')
    setSecilenKampanya('')
    syncSearchParams({ q: '', kategori: '', marka: '', kampanya: '' })
  }

  return (
    <div className="shop-container py-6 sm:py-8">
      <div className="mb-6 rounded-lg bg-zinc-950 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="shop-eyebrow border-white/20 bg-white/10 text-orange-100">
              <PackageSearch className="h-4 w-4" />
              Ürün kataloğu
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Ürünler</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Baharat, kahve ve gurme ürünleri kategori, marka ve kampanya filtresiyle hızlı bulun.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="shop-btn-secondary border-white/20 bg-white/10 text-white hover:bg-white hover:text-zinc-950 lg:hidden"
          >
            {filtersOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            Filtreler
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="sticky top-24 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-zinc-950">
                <SlidersHorizontal className="h-5 w-5 text-orange-600" />
                Filtreler
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-orange-700 hover:text-orange-800"
              >
                Temizle
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Ürün ara</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={aramaText}
                    onChange={(e) => {
                      const nextValue = e.target.value
                      setVisibleProductLimit(INITIAL_PRODUCT_LIMIT)
                      setAramaText(nextValue)
                      syncSearchParams({ q: nextValue })
                    }}
                    placeholder="Ürün veya kategori adı..."
                    className="shop-input pl-9"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Kategori</span>
                <select
                  value={secilenKategori}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setVisibleProductLimit(INITIAL_PRODUCT_LIMIT)
                    setSecilenKategori(nextValue)
                    syncSearchParams({ kategori: nextValue })
                  }}
                  className="shop-input"
                >
                  <option value="">Tüm kategoriler</option>
                  {kategoriler.map((kat) => (
                    <option key={kat.id} value={kat.id}>
                      {kat.kategori_adi}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Marka</span>
                <select
                  value={secilenMarka}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    setVisibleProductLimit(INITIAL_PRODUCT_LIMIT)
                    setSecilenMarka(nextValue)
                    syncSearchParams({ marka: nextValue })
                  }}
                  className="shop-input"
                >
                  <option value="">Tüm markalar</option>
                  {markalar.map((marka) => (
                    <option key={marka.id} value={marka.id}>
                      {marka.marka_adi}
                    </option>
                  ))}
                </select>
              </label>

              {activeCampaign && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Aktif kampanya</p>
                  <p className="mt-1 break-words text-sm font-bold text-zinc-900">{activeCampaign.ad || activeCampaign.kampanya_adi}</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-zinc-600">
              {loading ? 'Ürünler yükleniyor' : loadError || `${urunler.length}${hasMoreProducts ? '+' : ''} ürün bulundu`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
              ))}
            </div>
          ) : loadError ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
              <PackageSearch className="h-12 w-12 text-red-300" />
              <h2 className="mt-3 text-xl font-bold text-zinc-950">Ürünler yüklenemedi</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">{loadError}</p>
              <button type="button" onClick={loadUrunler} className="shop-btn-primary mt-5">
                Tekrar dene
              </button>
            </div>
          ) : urunler.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
              <PackageSearch className="h-12 w-12 text-zinc-300" />
              <h2 className="mt-3 text-xl font-bold text-zinc-950">Ürün bulunamadı</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Arama veya filtreleri değiştirerek tekrar deneyebilirsiniz.
              </p>
              <button type="button" onClick={clearFilters} className="shop-btn-primary mt-5">
                Filtreleri temizle
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {urunler.map((urun) => (
                  <UrunKart key={urun.id} urun={urun} kampanya={activeCampaign} />
                ))}
              </div>
              {hasMoreProducts && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleProductLimit((current) => current + INITIAL_PRODUCT_LIMIT)}
                    className="shop-btn-secondary"
                  >
                    Daha fazla ürün göster
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
