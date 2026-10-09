import { ArtDecoration } from './ArtDecoration'
import { SiteImage } from './SiteImage'
import { Link } from 'react-router-dom'
import { ShieldCheck, Sprout, Truck } from 'lucide-react'
import SellerInformation from './SellerInformation'
import { legalDocuments } from '../lib/legal-documents'
import { useTheme } from '../contexts/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'

export default function Footer() {
  const { logo, siteInfo, loading: themeLoading } = useTheme()

  return (
    <footer className="support-footer mt-auto border-t border-brand-line bg-brand-soft text-brand-ink">
      <ArtDecoration kind="divider" className="support-footer-divider" />
      <ArtDecoration kind="footer-left" className="support-footer-corner support-footer-left" />
      <ArtDecoration kind="footer-right" className="support-footer-corner" />
      <div className="shop-container py-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-emerald-700">
                {logo.url ? (
                  <SiteImage variant="thumb" src={getImageUrl(logo.url)} alt={`${siteInfo.siteName} logosu`} className="h-full w-full object-contain object-center" />
                ) : themeLoading ? null : <Sprout className="h-7 w-7" aria-hidden="true" />}
              </div>
              <div>
                <div className="break-words font-display text-2xl font-medium">{siteInfo.siteName}</div>
                <div className="mt-1 text-xs text-brand-muted">{siteInfo.tagline}</div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-6 text-brand-muted">
              {siteInfo.description}
            </p>
            <div className="mt-5"><SellerInformation variant="footer" /></div>
          </div>

          <div>
            <h3 className="mb-4 text-xl text-brand-ink">Alışveriş</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link to="/urunler" className="inline-flex min-h-11 items-center hover:underline">Tüm Ürünler</Link></li>
              <li><Link to="/en-cok-satan" className="inline-flex min-h-11 items-center hover:underline">En Çok Satanlar</Link></li>
              <li><Link to="/kampanyalar" className="inline-flex min-h-11 items-center hover:underline">Kampanyalar</Link></li>
              <li><Link to="/sepet" className="inline-flex min-h-11 items-center hover:underline">Sepetim</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xl text-brand-ink">Hesap</h3>
            <ul className="grid gap-2 text-sm">
              <li><Link to="/giris" className="inline-flex min-h-11 items-center hover:underline">Giriş Yap</Link></li>
              <li><Link to="/kayit" className="inline-flex min-h-11 items-center hover:underline">Kayıt Ol</Link></li>
              <li><Link to="/hesabim" className="inline-flex min-h-11 items-center hover:underline">Hesabım</Link></li>
              <li><Link to="/sorularim" className="inline-flex min-h-11 items-center hover:underline">Sorularım</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xl text-brand-ink">Yardım</h3>
            <div className="grid gap-3 text-sm text-brand-muted">
              <div className="flex gap-3">
                <Truck className="site-secondary-text mt-0.5 h-4 w-4 shrink-0" />
                <span>Sipariş ve kargo takibi</span>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="site-secondary-text mt-0.5 h-4 w-4 shrink-0" />
                <span>Güvenli ödeme altyapısı</span>
              </div>
              <Link to="/bize-ulasin" className="shop-btn-secondary mt-2">
                Bize Ulaşın
              </Link>
            </div>
          </div>
        </div>

        <nav aria-label="Yasal ve ticari bilgiler" className="mt-8 border-t border-brand-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {legalDocuments.map(document => <li key={document.path} className="min-w-0"><Link to={document.path} className="inline-flex min-h-11 items-center break-words hover:underline">{document.title}</Link></li>)}
          </ul>
        </nav>

        <div className="mt-10 border-t border-brand-line pt-6 text-center text-xs text-brand-muted">
          © {new Date().getFullYear()} EfsaneBaharat.com - Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  )
}
