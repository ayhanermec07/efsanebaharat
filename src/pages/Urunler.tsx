import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowUpDown, Loader2, PackageSearch, RotateCcw, Search, SlidersHorizontal, Tag, X } from 'lucide-react'
import UrunKart from '../components/UrunKart'
import { useAuth } from '../contexts/AuthContext'
import { buildCategoryTree, getCategoryBranchIds, getCategoryPath, loadCategories } from '../lib/category-hierarchy'
import { publicSupabase } from '../lib/supabase'
import {
  CATALOG_SORTS,
  isCatalogSort,
  loadPublicCatalog,
  type CatalogBrand,
  type CatalogCampaign,
  type CatalogCategory,
  type CatalogProduct,
} from '../lib/catalog'

const PAGE_SIZE = 24
const SEARCH_DEBOUNCE_MS = 350

type FilterKey = 'q' | 'kategori' | 'marka' | 'kampanya' | 'sirala'

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function Urunler() {
  const { user, musteriData } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const q = searchParams.get('q') || ''
  const kategori = searchParams.get('kategori') || ''
  const marka = searchParams.get('marka') || ''
  const kampanya = searchParams.get('kampanya') || ''
  const siralaParam = searchParams.get('sirala')
  const sirala = isCatalogSort(siralaParam) ? siralaParam : 'onerilen'

  const [urunler, setUrunler] = useState<CatalogProduct[]>([])
  const [toplam, setToplam] = useState(0)
  const [sonrakiImlec, setSonrakiImlec] = useState<string | null>(null)
  const [kategoriler, setKategoriler] = useState<CatalogCategory[]>([])
  const [markalar, setMarkalar] = useState<CatalogBrand[]>([])
  const [activeCampaign, setActiveCampaign] = useState<CatalogCampaign | null>(null)
  const [campaignInvalid, setCampaignInvalid] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [aramaText, setAramaText] = useState(q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const pageControllerRef = useRef<AbortController | null>(null)
  const metaLoadedRef = useRef(false)
  const categoryTree = useMemo(() => buildCategoryTree(kategoriler), [kategoriler])
  const categoryPath = useMemo(() => getCategoryPath(kategoriler, kategori), [kategoriler, kategori])
  const mainCategoryId = categoryPath[0]?.id || kategori
  const subCategories = useMemo(() => {
    const branch = getCategoryBranchIds(kategoriler, mainCategoryId)
    return kategoriler.filter(category => category.id !== mainCategoryId && branch.has(category.id))
      .map(category => ({ ...category, label: getCategoryPath(kategoriler, category.id).slice(1).map(parent => parent.kategori_adi).join(' → ') }))
      .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
  }, [kategoriler, mainCategoryId])

  const updateParams = useCallback((values: Partial<Record<FilterKey, string>>, replace = false) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) {
        const trimmed = (value || '').trim()
        if (trimmed && !(key === 'sirala' && trimmed === 'onerilen')) next.set(key, trimmed)
        else next.delete(key)
      }
      return next
    }, { replace })
  }, [setSearchParams])

  // URL dışarıdan değişirse (geri tuşu, header araması) input'u eşitle.
  useEffect(() => {
    setAramaText((current) => (current.trim() === q ? current : q))
  }, [q])

  useEffect(() => {
    if (aramaText.trim() === q.trim()) return
    const timeout = window.setTimeout(() => updateParams({ q: aramaText }, true), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [aramaText, q, updateParams])

  const viewerKey = `${user?.id || 'anon'}:${musteriData?.musteri_tipi || ''}`

  useEffect(() => {
    const controller = new AbortController()
    pageControllerRef.current?.abort()
    pageControllerRef.current = controller

    setLoading(true)
    setLoadError(null)
    setLoadMoreError(null)
    setCampaignInvalid(false)

    const includeMeta = !metaLoadedRef.current
    Promise.all([loadPublicCatalog({
      q, kategori, marka, kampanya, sirala,
      limit: PAGE_SIZE,
      meta: includeMeta,
    }, controller.signal), includeMeta ? loadCategories(publicSupabase, true) : Promise.resolve(null)])
      .then(([page, categories]) => {
        if (controller.signal.aborted) return
        if (categories) setKategoriler(categories)
        if (page.markalar) setMarkalar(page.markalar)
        if (categories && page.markalar) metaLoadedRef.current = true
        setUrunler(page.urunler)
        setToplam(page.toplam)
        setSonrakiImlec(page.sonrakiImlec)
        setActiveCampaign(page.kampanya)
        setCampaignInvalid(page.kampanyaGecersiz)
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return
        console.error('Ürün yükleme hatası:', error)
        setUrunler([])
        setToplam(0)
        setSonrakiImlec(null)
        setLoadError('Ürünler şu anda yüklenemedi. Lütfen tekrar deneyin.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [q, kategori, marka, kampanya, sirala, viewerKey, reloadKey])

  async function loadMore() {
    if (!sonrakiImlec || loadingMore) return
    const controller = pageControllerRef.current
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await loadPublicCatalog({
        q, kategori, marka, kampanya, sirala, imlec: sonrakiImlec, limit: PAGE_SIZE,
      }, controller?.signal)
      if (controller?.signal.aborted) return
      setUrunler((current) => {
        const seen = new Set(current.map((urun) => urun.id))
        return [...current, ...page.urunler.filter((urun) => !seen.has(urun.id))]
      })
      setToplam(page.toplam)
      setSonrakiImlec(page.sonrakiImlec)
    } catch (error) {
      if (controller?.signal.aborted || isAbortError(error)) return
      console.error('Sonraki sayfa yükleme hatası:', error)
      setLoadMoreError('Sonraki ürünler yüklenemedi.')
    } finally {
      if (!controller?.signal.aborted) setLoadingMore(false)
    }
  }

  const clearFilters = () => {
    setAramaText('')
    updateParams({ q: '', kategori: '', marka: '', kampanya: '', sirala: '' })
  }

  const hasFilters = Boolean(q || kategori || marka || kampanya)
  const campaignForCards = activeCampaign
    ? { indirim_tipi: activeCampaign.indirim_tipi, indirim_degeri: Number(activeCampaign.indirim_degeri) }
    : null

  return (
    <div className="shop-container py-6 sm:py-8">
      <div className="shop-page-heading mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="shop-eyebrow">
              <PackageSearch className="h-4 w-4" />
              Ürün kataloğu
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Ürünler</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base">
              Baharat, kahve ve gurme ürünleri kategori, marka ve kampanya filtresiyle hızlı bulun.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
            className="shop-btn-secondary lg:hidden"
          >
            {filtersOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            Filtreler
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} min-w-0 lg:block`}>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-zinc-950">
                <SlidersHorizontal className="h-5 w-5 text-orange-600" />
                Filtreler
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-[36px] px-2 text-xs font-bold text-orange-700 hover:text-orange-800"
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
                    type="search"
                    value={aramaText}
                    onChange={(e) => setAramaText(e.target.value)}
                    maxLength={100}
                    placeholder="Ürün, kategori veya marka..."
                    className="shop-input pl-9"
                  />
                </div>
              </label>

              <div className="min-w-0">
                <label htmlFor="catalog-main-category" className="mb-1.5 block text-sm font-bold text-zinc-700">Ana kategori</label>
                <select
                  id="catalog-main-category"
                  value={mainCategoryId}
                  onChange={(e) => updateParams({ kategori: e.target.value })}
                  className="shop-input"
                >
                  <option value="">Tüm kategoriler</option>
                  {kategori && !categoryPath.length && <option value={kategori}>Seçili kategori</option>}
                  {categoryTree.map(({ category }) => (
                    <option key={category.id} value={category.id}>
                      {category.kategori_adi}
                    </option>
                  ))}
                </select>
              </div>

              {subCategories.length > 0 && <div className="min-w-0">
                <label htmlFor="catalog-sub-category" className="mb-1.5 block text-sm font-bold text-zinc-700">Alt kategori</label>
                <select id="catalog-sub-category" value={kategori === mainCategoryId ? '' : kategori} onChange={event => updateParams({ kategori: event.target.value || mainCategoryId })} className="shop-input">
                  <option value="">Tüm alt kategoriler</option>
                  {subCategories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </div>}

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-zinc-700">Marka</span>
                <select
                  value={marka}
                  onChange={(e) => updateParams({ marka: e.target.value })}
                  className="shop-input"
                >
                  <option value="">Tüm markalar</option>
                  {markalar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.marka_adi}
                    </option>
                  ))}
                </select>
              </label>

              {activeCampaign && (
                <div className="flex items-start justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Aktif kampanya</p>
                    <p className="mt-1 break-words text-sm font-bold text-zinc-900">{activeCampaign.ad || activeCampaign.baslik}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateParams({ kampanya: '' })}
                    aria-label="Kampanya filtresini kaldır"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-orange-700 hover:bg-orange-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {categoryPath.length > 0 && <p className="mb-1 break-words text-sm text-brand-muted" aria-label="Kategori yolu">{categoryPath.map(category => category.kategori_adi).join(' → ')}</p>}
              <p className="text-sm font-bold text-zinc-600" aria-live="polite">
                {loading
                  ? 'Ürünler yükleniyor'
                  : loadError
                    ? 'Ürünler yüklenemedi'
                    : `${toplam} ürün bulundu`}
              </p>
              {!loading && !loadError && toplam > 0 && (
                <p className="text-xs text-zinc-500">{urunler.length} / {toplam} gösteriliyor</p>
              )}
              {activeCampaign && (
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-bold text-orange-700 lg:hidden">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activeCampaign.ad || activeCampaign.baslik}</span>
                </p>
              )}
            </div>
            <label className="flex min-w-0 items-center gap-2 sm:w-64">
              <ArrowUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="sr-only">Sıralama</span>
              <select
                value={sirala}
                onChange={(e) => updateParams({ sirala: e.target.value })}
                className="shop-input min-w-0 flex-1"
              >
                {CATALOG_SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>{sort.label}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
              ))}
            </div>
          ) : loadError ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-300" />
              <h2 className="mt-3 text-xl font-bold text-zinc-950">Ürünler yüklenemedi</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-600">{loadError}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="shop-btn-primary mt-5">
                <RotateCcw className="h-4 w-4" />
                Tekrar dene
              </button>
            </div>
          ) : campaignInvalid ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-orange-200 bg-white p-6 text-center">
              <Tag className="h-12 w-12 text-orange-300" />
              <h2 className="mt-3 text-xl font-bold text-zinc-950">Kampanya bulunamadı</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Bu kampanyanın süresi dolmuş veya hesabınız için geçerli olmayabilir.
              </p>
              <button type="button" onClick={() => updateParams({ kampanya: '' })} className="shop-btn-primary mt-5">
                Tüm ürünleri göster
              </button>
            </div>
          ) : urunler.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
              <PackageSearch className="h-12 w-12 text-brand-muted" />
              <h2 className="mt-3 text-xl font-bold text-zinc-950">Ürün bulunamadı</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Arama veya filtreleri değiştirerek tekrar deneyebilirsiniz.
              </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="shop-btn-primary mt-5">
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {urunler.map((urun) => (
                  <UrunKart key={urun.id} urun={urun} kampanya={campaignForCards} />
                ))}
              </div>
              {(sonrakiImlec || loadMoreError) && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  {loadMoreError && <p className="text-sm font-semibold text-red-600">{loadMoreError}</p>}
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore || !sonrakiImlec}
                    className="shop-btn-secondary"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loadMoreError ? 'Tekrar dene' : 'Daha fazla ürün göster'}
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
