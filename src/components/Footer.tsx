import { Link } from 'react-router-dom'
import { ArtDecoration } from './ArtDecoration'
import SellerInformation from './SellerInformation'
import { legalDocuments } from '../lib/legal-documents'

const columns = [
  { title:'Keşfet', links:[['Ürünler','/urunler'],['Kategoriler','/urunler'],['En Çok Satanlar','/en-cok-satan'],['Kampanyalar','/kampanyalar']] },
  { title:'Yardım', links:[['İletişim','/bize-ulasin'],['Sıkça Sorulan Sorular','/islem-rehberi'],['Kargo ve Teslimat','/teslimat-kargo'],['İade ve Değişim','/iade-iptal-cayma']] },
  { title:'Hesabım', links:[['Hesabım','/hesabim'],['Siparişlerim','/hesabim'],['Sepetim','/sepet']] },
]

export default function Footer() {
  return <footer className="support-footer mt-auto text-brand-ink">
    <div className="footer-art-separator" aria-hidden="true">
      <span /><ArtDecoration kind="divider" className="support-footer-divider" /><span />
    </div>
    <div className="footer-main">
      <ArtDecoration kind="footer-left" className="support-footer-corner support-footer-left" />
      <ArtDecoration kind="footer-right" className="support-footer-corner" />
      <div className="footer-columns">
        <Link to="/" className="footer-brand" aria-label="Efsane Baharat ana sayfa">
          <ArtDecoration kind="footer-brand" className="footer-brand-illustration" />
          <span className="footer-brand-name">EFSANE BAHARAT</span>
          <span className="footer-brand-rule" aria-hidden="true"><i /><span>✻</span><i /></span>
          <span className="footer-brand-tagline">Sofranıza bir tutam lezzet</span>
        </Link>
        {columns.map(column=><nav key={column.title} aria-label={column.title} className="footer-link-column">
          <h3>{column.title}</h3>
          <ul>{column.links.map(([label,to])=><li key={label}><Link to={to}>{label}</Link></li>)}</ul>
        </nav>)}
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Efsane Baharat</span>
      <div className="footer-bottom-links">
        <Link to="/gizlilik">Gizlilik</Link>
        <details className="footer-legal">
          <summary>Yasal bilgiler</summary>
          <div className="footer-legal-panel">
            <nav aria-label="Yasal ve ticari bilgiler"><ul>{legalDocuments.map(document=><li key={document.path}><Link to={document.path}>{document.title}</Link></li>)}</ul></nav>
            <SellerInformation variant="footer" />
          </div>
        </details>
      </div>
    </div>
  </footer>
}
