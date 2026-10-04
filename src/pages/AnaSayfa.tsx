import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Sprout } from 'lucide-react'
import CanliDestekWidget from '../components/CanliDestekWidget'
import UrunKart from '../components/UrunKart'
import { publicSupabase } from '../lib/supabase'
import { loadPublicCatalog } from '../lib/catalog'
import { getImageUrl } from '../utils/imageUtils'
import { useAuth } from '../contexts/AuthContext'

const pageSize = 4

export default function AnaSayfa() {
  const [banners, setBanners] = useState<any[]>([])
  const [oneCikanUrunler, setOneCikanUrunler] = useState<any[]>([])
  const [enCokSatanlar, setEnCokSatanlar] = useState<any[]>([])
  const [yeniEklenenler, setYeniEklenenler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)
  const [bestsellerPage, setBestsellerPage] = useState(0)
  const [newProductsPage, setNewProductsPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const { musteriData } = useAuth()
  
  const musteriTipi = musteriData?.musteri_tipi || 'musteri'

  useEffect(() => {
    if (hasLoadedRef.current) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const now = new Date().toISOString()

        const [catalog, campaignResponse] = await Promise.all([
          loadPublicCatalog({ limit: 16, sirala: 'yeni', meta: true }),
          publicSupabase
            .from('kampanyalar')
            .select('id, ad, aciklama, banner_gorseli, kapsam, kategori_id, marka_id, kod, hedef_grup, sira_no')
            .eq('aktif', true)
            .eq('anasayfada_goster', true)
            .in('hedef_grup', ['hepsi', musteriTipi])
            .lte('baslangic_tarihi', now)
            .gte('bitis_tarihi', now)
            .order('sira_no')
        ])
        // DTO ürün, görsel ve yalnız izinli satış satırlarını iç içe döndürür.
        const products = catalog.urunler
        setOneCikanUrunler(products.slice(0, 4))
        setEnCokSatanlar(products.slice(0, 12))
        setYeniEklenenler(products)
        setMarkalar(catalog.markalar || [])
        if (campaignResponse.error) {
          console.error('Ana sayfa kampanyaları yüklenemedi:', campaignResponse.error)
        } else {
          setBanners(campaignResponse.data || [])
        }
        hasLoadedRef.current = true
      } catch (err) {
        console.error('Veri yükleme hatası:', err)
        setError('Veriler yüklenirken bir hata oluştu.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [musteriTipi])

  useEffect(() => {
    setCurrentBanner((current) => Math.min(current, Math.max(banners.length - 1, 0)))

    if (banners.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const interval = window.setInterval(() => {
      setCurrentBanner((current) => (current + 1) % banners.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [banners.length])

  const activeBanner = banners[currentBanner]
  const heroProduct = oneCikanUrunler.find(product => product.urun_gorselleri?.[0]?.gorsel_url || product.ana_gorsel_url)
  const heroImage = getImageUrl(activeBanner?.banner_gorseli || heroProduct?.urun_gorselleri?.[0]?.gorsel_url || heroProduct?.ana_gorsel_url)
  const heroTitle = activeBanner?.ad || 'Sofranın sırrı, bir tutam baharat.'
  const heroText = activeBanner?.aciklama || 'Tanıdık tatları yeniden keşfedin. Mutfağınızın vazgeçilmez baharatları bir arada.'
  
  let heroLink = '/urunler'
  if (activeBanner) {
    if (activeBanner.kapsam === 'kategori' && activeBanner.kategori_id) {
      heroLink = `/urunler?kategori=${activeBanner.kategori_id}&kampanya=${activeBanner.id}`
    } else if (activeBanner.kapsam === 'marka' && activeBanner.marka_id) {
      heroLink = `/urunler?marka=${activeBanner.marka_id}&kampanya=${activeBanner.id}`
    } else {
      heroLink = `/urunler?kampanya=${activeBanner.id}`
    }
  }

  const nextBanner = () => setCurrentBanner((prev) => (prev + 1) % Math.max(banners.length, 1))
  const prevBanner = () => setCurrentBanner((prev) => (prev - 1 + Math.max(banners.length, 1)) % Math.max(banners.length, 1))

  if (loading) {
    return (
      <div className="shop-container py-16">
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="shop-container flex min-h-[60vh] items-center justify-center py-16">
        <div className="max-w-md rounded-lg border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="mb-4 font-semibold text-red-600">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="shop-btn-primary">
            Tekrar dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <section className="shop-container py-7 sm:py-10 lg:py-12">
        <div className="grid items-center gap-7 md:grid-cols-2 md:gap-10 lg:gap-16">
            <div className="min-w-0 py-2">
              <p className="shop-eyebrow">
                {activeBanner ? 'Öne çıkan kampanya' : 'Günlük mutfağınıza'}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl leading-[1.12] text-brand-ink sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-brand-muted">
                {heroText}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={heroLink} className="shop-btn-primary">
                  {activeBanner ? 'Kampanyayı incele' : 'Baharatları keşfet'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/kampanyalar" className="shop-btn-secondary">Kampanyalar</Link>
              </div>
            </div>
          <div className="shop-hero-art aspect-[4/3] md:aspect-square lg:aspect-[4/3]">
            {heroImage ? <img src={heroImage} alt={activeBanner?.banner_gorseli ? activeBanner.ad : heroProduct?.urun_adi || 'Baharat seçkimiz'} className="h-full w-full object-contain" fetchPriority="high" /> : <div className="flex flex-col items-center gap-4 text-emerald-700"><Sprout className="h-16 w-16 stroke-1" aria-hidden="true" /><span className="font-display text-2xl">Sofranıza bir tutam lezzet</span></div>}
          </div>
        </div>
          {banners.length > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1" aria-label="Kampanya seçimi">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                  type="button"
                  onClick={() => setCurrentBanner(index)}
                    className="grid h-11 w-11 place-items-center rounded-lg"
                    aria-label={`${index + 1}. kampanyayı göster`}
                    aria-current={index === currentBanner}
                  >
                    <span className={`h-2 min-w-2 rounded-full transition-all ${index === currentBanner ? 'site-primary-bg w-6' : 'bg-zinc-300'}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={prevBanner} className="shop-icon-button" aria-label="Önceki banner">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={nextBanner} className="shop-icon-button" aria-label="Sonraki banner">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
      </section>

      {oneCikanUrunler.length > 0 && (
        <ProductRail title="Öne çıkan ürünler" link="/urunler" products={oneCikanUrunler} />
      )}

      {enCokSatanlar.length > 0 && (
        <ProductRail
          title="En çok satanlar"
          link="/en-cok-satan"
          products={enCokSatanlar.slice(bestsellerPage * pageSize, (bestsellerPage + 1) * pageSize)}
          total={enCokSatanlar.length}
          page={bestsellerPage}
          onPageChange={setBestsellerPage}
        />
      )}

      {yeniEklenenler.length > 0 && (
        <ProductRail
          title="Yeni eklenenler"
          link="/urunler"
          products={yeniEklenenler.slice(newProductsPage * pageSize, (newProductsPage + 1) * pageSize)}
          total={yeniEklenenler.length}
          page={newProductsPage}
          onPageChange={setNewProductsPage}
        />
      )}

      {markalar.length > 0 && (
        <section className="shop-container py-10">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl text-brand-ink sm:text-3xl">Markalarımız</h2>
            </div>
            <Link to="/urunler" className="shop-btn-secondary min-h-[40px] px-4 py-2 text-sm">
              Tümü
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {markalar.map((marka) => {
              const logoUrl = getImageUrl(marka.logo_url)

              return (
                <Link
                  key={marka.id}
                  to={`/urunler?marka=${marka.id}`}
                  className="group flex min-h-[172px] min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                >
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-50 p-4">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={`${marka.marka_adi} logosu`}
                        className="max-h-full max-w-full object-contain transition duration-200 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-100 text-2xl font-bold text-orange-700">
                        {marka.marka_adi?.charAt(0) || 'M'}
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-[56px] items-center justify-center border-t border-zinc-100 px-3 py-3 text-center">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-800 group-hover:text-orange-700">
                      {marka.marka_adi}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <CanliDestekWidget />
    </div>
  )
}

interface ProductRailProps {
  title: string
  link: string
  products: any[]
  total?: number
  page?: number
  onPageChange?: (page: number) => void
}

function ProductRail({ title, link, products, total, page = 0, onPageChange }: ProductRailProps) {
  const pageCount = Math.ceil((total || products.length) / pageSize)

  return (
    <section className="shop-container py-8 sm:py-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl text-brand-ink sm:text-3xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {onPageChange && pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800 disabled:opacity-40"
                aria-label="Önceki sayfa"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
                disabled={page >= pageCount - 1}
                className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800 disabled:opacity-40"
                aria-label="Sonraki sayfa"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <Link to={link} className="shop-btn-secondary min-h-[40px] px-4 py-2 text-sm">
            Tümünü gör
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {products.map((urun) => (
          <UrunKart key={urun.id} urun={urun} />
        ))}
      </div>
    </section>
  )
}
