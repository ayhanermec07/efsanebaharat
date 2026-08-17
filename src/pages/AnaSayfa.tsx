import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import CanliDestekWidget from '../components/CanliDestekWidget'
import UrunKart from '../components/UrunKart'
import { loadPublicCatalog, publicSupabase } from '../lib/supabase'
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
          loadPublicCatalog(16),
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
        const enrichProduct = (urun: any) => ({
          ...urun,
          urun_gorselleri: (catalog.gorseller || []).filter((gorsel: any) => gorsel.urun_id === urun.id),
          urun_stoklari: (catalog.stoklar || []).filter((stok: any) => stok.urun_id === urun.id),
          kategoriler: (catalog.kategoriler || []).find((kategori: any) => kategori.id === urun.kategori_id),
          markalar: (catalog.markalar || []).find((marka: any) => marka.id === urun.marka_id)
        })
        const products = (catalog.urunler || []).map(enrichProduct)
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

    if (banners.length < 2) return

    const interval = window.setInterval(() => {
      setCurrentBanner((current) => (current + 1) % banners.length)
    }, 6000)

    return () => window.clearInterval(interval)
  }, [banners.length])

  const activeBanner = banners[currentBanner]
  const heroImage = getImageUrl(activeBanner?.banner_gorseli || oneCikanUrunler[0]?.urun_gorselleri?.[0]?.gorsel_url)
  const heroTitle = activeBanner?.ad || 'Mutfakta fark yaratan lezzetler'
  const heroText = activeBanner?.aciklama || 'Özenle seçilmiş baharatlar, kahveler ve gurme ürünler tek yerde.'
  
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
      <section className="shop-container pt-5 sm:pt-8">
        <div className="relative overflow-hidden rounded-lg bg-zinc-950 text-white shadow-xl">
          {heroImage && (
            <img
              src={heroImage}
              alt={heroTitle}
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/20" />

          <div className="relative flex min-h-[370px] items-end p-5 sm:min-h-[420px] sm:p-8 lg:min-h-[500px] lg:p-12">
            <div className="max-w-2xl pb-8 sm:pb-7">
              <p className="text-xs font-extrabold tracking-[0.18em] text-orange-200">
                {activeBanner ? 'ÖNE ÇIKAN KAMPANYA' : 'EFSANE BAHARAT'}
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-zinc-200 sm:text-lg">
                {heroText}
              </p>
              <div className="mt-7">
                <Link to={heroLink} className="shop-btn-primary">
                  {activeBanner ? 'Kampanyayı incele' : 'Ürünleri incele'}
                </Link>
              </div>
            </div>
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-4 left-5 right-4 flex items-center justify-between gap-3 sm:left-8 lg:left-12">
              <div className="flex gap-2" aria-label="Kampanya seçimi">
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                  type="button"
                  onClick={() => setCurrentBanner(index)}
                    className="grid h-10 w-10 place-items-center"
                    aria-label={`${index + 1}. kampanyayı göster`}
                    aria-current={index === currentBanner}
                  >
                    <span className={`h-3 min-w-3 rounded-full transition-all ${index === currentBanner ? 'w-8 bg-white' : 'bg-white/50 hover:bg-white/80'}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={prevBanner} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-sm" aria-label="Önceki banner">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={nextBanner} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-zinc-950 shadow-sm" aria-label="Sonraki banner">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
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
              <h2 className="text-2xl font-extrabold uppercase tracking-[0.02em] text-zinc-950 sm:text-3xl">GÜVENİLEN SEÇİMLER</h2>
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

      <section className="shop-container pb-12 pt-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Truck, title: 'Hızlı operasyon', text: 'Siparişler stok ve kargo akışı için hazırlanır.' },
            { icon: ShieldCheck, title: 'Güvenli alışveriş', text: 'Ödeme ve sipariş süreci server taraflı doğrulamaya hazır.' },
            { icon: ShoppingBag, title: 'Bayi uyumlu', text: 'Bayi fiyatları, XML stokları ve seçili sortiler desteklenir.' }
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex min-w-0 gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-950">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{item.text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
          <h2 className="text-2xl font-extrabold uppercase tracking-[0.02em] text-zinc-950 sm:text-3xl">{title.toLocaleUpperCase('tr-TR')}</h2>
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
