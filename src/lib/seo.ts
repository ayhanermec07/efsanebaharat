const publicPages: Record<string, { title: string; description: string }> = {
  '/': { title: 'Efsane Baharat', description: 'Efsane Baharat ürünlerini ve mağaza sayfalarını keşfedin.' },
  '/urunler': { title: 'Ürünler | Efsane Baharat', description: 'Efsane Baharat ürünlerini inceleyin.' },
  '/en-cok-satan': { title: 'En Çok Satanlar | Efsane Baharat', description: 'Efsane Baharat mağazasında en çok satan ürünleri inceleyin.' },
  '/kampanyalar': { title: 'Kampanyalar | Efsane Baharat', description: 'Efsane Baharat mağazasındaki güncel kampanyaları inceleyin.' },
  '/bize-ulasin': { title: 'Bize Ulaşın | Efsane Baharat', description: 'Efsane Baharat ile iletişime geçin.' }
}

const draftLegalTitles: Record<string, string> = {
  '/on-bilgilendirme': 'Ön Bilgilendirme Formu',
  '/mesafeli-satis-sozlesmesi': 'Mesafeli Satış Sözleşmesi',
  '/teslimat-kargo': 'Teslimat ve Kargo Politikası',
  '/iade-iptal-cayma': 'İade / İptal / Cayma Hakkı Politikası',
  '/kvkk': 'KVKK Aydınlatma Metni',
  '/gizlilik': 'Gizlilik Politikası',
  '/islem-rehberi': 'İşlem Rehberi',
}

export function seoForPath(path: string, origin: string) {
  const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '')
  const publicPage = publicPages[normalizedPath]
  if (publicPage) return {
    ...publicPage,
    canonical: new URL(normalizedPath, origin).href,
    robots: 'index,follow'
  }

  const title = draftLegalTitles[normalizedPath] || (normalizedPath.startsWith('/admin') ? 'Yönetim' :
    normalizedPath.startsWith('/urun/') ? 'Ürün Detayı' :
      normalizedPath === '/giris' ? 'Giriş' :
        normalizedPath === '/kayit' ? 'Kayıt' : 'Sayfa')
  return {
    title: `${title} | Efsane Baharat`,
    description: 'Efsane Baharat',
    canonical: null,
    robots: 'noindex,nofollow'
  }
}
