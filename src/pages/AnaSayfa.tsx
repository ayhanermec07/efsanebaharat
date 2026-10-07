import { SiteImage } from '../components/SiteImage'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, Sprout } from 'lucide-react'
import CanliDestekWidget from '../components/CanliDestekWidget'
import UrunKart from '../components/UrunKart'
import { publicSupabase } from '../lib/supabase'
import { loadPublicCatalog } from '../lib/catalog'
import { getImageUrl } from '../utils/imageUtils'
import CampaignCarousel from '../components/CampaignCarousel'
import { homeCampaignSlides, type CampaignSlide } from '../lib/home-campaigns'
import { useAuth } from '../contexts/AuthContext'

const pageSize = 5

export default function AnaSayfa() {
  const [banners, setBanners] = useState<CampaignSlide[]>([])
  const [oneCikanUrunler, setOneCikanUrunler] = useState<any[]>([])
  const [enCokSatanlar, setEnCokSatanlar] = useState<any[]>([])
  const [yeniEklenenler, setYeniEklenenler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [bestsellerPage, setBestsellerPage] = useState(0)
  const [newProductsPage, setNewProductsPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { musteriData } = useAuth()
  
  const musteriTipi = musteriData?.musteri_tipi || 'musteri'

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const now = new Date().toISOString()

        const [catalog, campaignResponse] = await Promise.all([
          loadPublicCatalog({ limit: 15, sirala: 'yeni', meta: true }),
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
        if (!active) return
        // DTO ürün, görsel ve yalnız izinli satış satırlarını iç içe döndürür.
        const products = catalog.urunler
        setOneCikanUrunler(products.slice(0, 5))
        setEnCokSatanlar(products.slice(0, 15))
        setYeniEklenenler(products)
        setMarkalar(catalog.markalar || [])
        const campaigns = campaignResponse.data || []
        if (campaignResponse.error) console.error('Ana sayfa kampanyaları yüklenemedi:', campaignResponse.error)
        const artwork = campaigns.length ? await publicSupabase.from('kampanya_banner')
          .select('id, kampanya_id, gorsel_url, baslik').eq('aktif', true)
          .in('kampanya_id', campaigns.map(campaign => campaign.id)).order('goruntuleme_sirasi').order('id') : null
        if (artwork?.error) console.error('Kampanya bannerları yüklenemedi:', artwork.error)
        if (active) setBanners(homeCampaignSlides(campaigns, artwork?.data || []))
      } catch (err) {
        console.error('Veri yükleme hatası:', err)
        if (active) setError('Veriler yüklenirken bir hata oluştu.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [musteriTipi])

  const heroProduct = oneCikanUrunler.find(product => product.urun_gorselleri?.[0]?.gorsel_url || product.ana_gorsel_url)
  const heroImage = getImageUrl(heroProduct?.urun_gorselleri?.[0]?.gorsel_url || heroProduct?.ana_gorsel_url)
  const heroTitle = 'Sofranın sırrı, bir tutam baharat.'
  const heroText = 'Tanıdık tatları yeniden keşfedin. Mutfağınızın vazgeçilmez baharatları bir arada.'
  const heroLink = '/urunler'

  if (loading) {
    return (
      <div className="shop-container py-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => (
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
        {banners.length ? <CampaignCarousel slides={banners} /> : <div className="grid items-center gap-7 md:grid-cols-2 md:gap-10 lg:gap-16">
            <div className="min-w-0 py-2">
              <p className="shop-eyebrow">
                Günlük mutfağınıza
              </p>
              <h1 className="mt-4 max-w-xl text-4xl leading-[1.12] text-brand-ink sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-brand-muted">
                {heroText}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={heroLink} className="shop-btn-primary">
                  Baharatları keşfet
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/kampanyalar" className="shop-btn-secondary">Kampanyalar</Link>
              </div>
            </div>
          <div className="shop-hero-art aspect-[4/3] md:aspect-square lg:aspect-[4/3]">
            {heroImage ? <SiteImage variant="hero" loading="eager" src={heroImage} alt={heroProduct?.urun_adi || 'Baharat seçkimiz'} className="h-full w-full object-contain" fetchPriority="high" /> : <div className="flex flex-col items-center gap-4 text-emerald-700"><Sprout className="h-16 w-16 stroke-1" aria-hidden="true" /><span className="font-display text-2xl">Sofranıza bir tutam lezzet</span></div>}
          </div>
        </div>}
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
                      <SiteImage
                        sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {products.map((urun) => (
          <UrunKart key={urun.id} urun={urun} imageSizes="(min-width: 1280px) 230px, (min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw" />
        ))}
      </div>
    </section>
  )
}
