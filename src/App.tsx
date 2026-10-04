import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SepetProvider } from './contexts/SepetContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import SeoManager from './components/SeoManager'
import OfflineNotice from './components/OfflineNotice'
import { legalDocuments } from './lib/legal-documents'
const YasalBilgiler = lazy(() => import('./pages/YasalBilgiler'))
const AnaSayfa = lazy(() => import('./pages/AnaSayfa'))
const Urunler = lazy(() => import('./pages/Urunler'))
const UrunDetay = lazy(() => import('./pages/UrunDetay'))
const Sepet = lazy(() => import('./pages/Sepet'))
const Giris = lazy(() => import('./pages/Giris'))
const SifreSifirla = lazy(() => import('./pages/SifreSifirla'))
const Bulunamadi = lazy(() => import('./pages/Bulunamadi'))
const Kayit = lazy(() => import('./pages/Kayit'))
const Hesabim = lazy(() => import('./pages/Hesabim'))
const OdemeBasarili = lazy(() => import('./pages/OdemeBasarili'))
const EnCokSatan = lazy(() => import('./pages/EnCokSatan'))
const Kampanyalar = lazy(() => import('./pages/Kampanyalar'))
const BizeUlasin = lazy(() => import('./pages/BizeUlasin'))
const Sorularim = lazy(() => import('./pages/Sorularim'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminUrunler = lazy(() => import('./pages/admin/UrunlerYonetim'))
const AdminStokAzalan = lazy(() => import('./pages/admin/StokAzalan'))
const BayiPanel = lazy(() => import('./pages/BayiPanel'))
const BayiDashboard = lazy(() => import('./pages/BayiDashboard'))
const XmlMusteriSiparis = lazy(() => import('./pages/XmlMusteriSiparis'))
const XmlSiparislerim = lazy(() => import('./pages/XmlSiparislerim'))
const AdminKategoriler = lazy(() => import('./pages/admin/Kategoriler'))
const AdminMarkalar = lazy(() => import('./pages/admin/Markalar'))
const AdminSiparisler = lazy(() => import('./pages/admin/Siparisler'))
const AdminKargo = lazy(() => import('./pages/admin/Kargo'))
const AdminBayiler = lazy(() => import('./pages/admin/Bayiler'))
const AdminBayiSatislari = lazy(() => import('./pages/admin/BayiSatislari'))
const AdminMusteriler = lazy(() => import('./pages/admin/Musteriler'))
const AdminKampanyalar = lazy(() => import('./pages/admin/KampanyalarYonetim'))
const AdminSorular = lazy(() => import('./pages/admin/Sorular'))
const AdminCanliDestek = lazy(() => import('./pages/admin/CanliDestek'))
const AdminIskontoGruplari = lazy(() => import('./pages/admin/IskontoGruplari'))
const AdminAyarlar = lazy(() => import('./pages/admin/Ayarlar'))
const AdminXMLYonetim = lazy(() => import('./pages/admin/XMLYonetim'))
const AdminAsortiStok = lazy(() => import('./pages/admin/AsortiStok'))
import './App.css'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SepetProvider>
          <Router>
            <OfflineNotice />
            <SeoManager />
            <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center px-4 text-sm text-zinc-700">Sayfa yükleniyor…</div>}>
            <Routes>
              {/* Public routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<AnaSayfa />} />
                <Route path="/urunler" element={<Urunler />} />
                <Route path="/urun/:id" element={<UrunDetay />} />
                <Route path="/sepet" element={<Sepet />} />
                <Route path="/giris" element={<Giris />} />
                <Route path="/sifre-sifirla" element={<SifreSifirla />} />
                <Route path="/sifre-yenile" element={<SifreSifirla mode="update" />} />
                <Route path="/kayit" element={<Kayit />} />
                <Route path="/hesabim" element={<Hesabim />} />
                <Route path="/bayi-panel" element={<BayiPanel />} />
                <Route path="/bayi-dashboard" element={<BayiDashboard />} />
                <Route path="/xml-siparis" element={<XmlMusteriSiparis />} />
                <Route path="/xml-siparislerim" element={<XmlSiparislerim />} />
                <Route path="/odeme-basarili" element={<OdemeBasarili />} />
                <Route path="/odeme-basarisiz" element={<OdemeBasarili />} />
                <Route path="/en-cok-satan" element={<EnCokSatan />} />
                <Route path="/kampanyalar" element={<Kampanyalar />} />
                <Route path="/bize-ulasin" element={<BizeUlasin />} />
                <Route path="/sorularim" element={<Sorularim />} />
                {legalDocuments.map(document => <Route key={document.path} path={document.path} element={<YasalBilgiler />} />)}
                <Route path="*" element={<Bulunamadi />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="urunler" element={<AdminUrunler />} />
                <Route path="kategoriler" element={<AdminKategoriler />} />
                <Route path="markalar" element={<AdminMarkalar />} />
                <Route path="siparisler" element={<AdminSiparisler />} />
                <Route path="kargo" element={<AdminKargo />} />
                <Route path="bayiler" element={<AdminBayiler />} />
                <Route path="bayi-satislari" element={<AdminBayiSatislari />} />
                <Route path="musteriler" element={<AdminMusteriler />} />
                <Route path="kampanyalar" element={<AdminKampanyalar />} />
                <Route path="sorular" element={<AdminSorular />} />
                <Route path="canli-destek" element={<AdminCanliDestek />} />
                <Route path="iskonto" element={<AdminIskontoGruplari />} />
                <Route path="stok-azalan" element={<AdminStokAzalan />} />
                <Route path="ayarlar" element={<AdminAyarlar />} />
                <Route path="xml-yonetim" element={<AdminXMLYonetim />} />
                <Route path="asorti-stok" element={<AdminAsortiStok />} />
                <Route path="*" element={<Bulunamadi />} />
              </Route>
            </Routes>
            </Suspense>
          </Router>
        </SepetProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
