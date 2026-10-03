const publicPages: Record<string, { title: string; description: string }> = {
  '/': { title: 'Efsane Baharat', description: 'Efsane Baharat ürünlerini ve mağaza sayfalarını keşfedin.' },
  '/urunler': { title: 'Ürünler | Efsane Baharat', description: 'Efsane Baharat ürünlerini inceleyin.' },
  '/en-cok-satan': { title: 'En Çok Satanlar | Efsane Baharat', description: 'Efsane Baharat mağazasında en çok satan ürünleri inceleyin.' },
  '/kampanyalar': { title: 'Kampanyalar | Efsane Baharat', description: 'Efsane Baharat mağazasındaki güncel kampanyaları inceleyin.' },
  '/bize-ulasin': { title: 'Bize Ulaşın | Efsane Baharat', description: 'Efsane Baharat ile iletişime geçin.' }
}

export function seoForPath(path: string, origin: string) {
  const normalizedPath = path === '/' ? '/' : path.replace(/\/+$/, '')
  const publicPage = publicPages[normalizedPath]
  if (publicPage) return {
    ...publicPage,
    canonical: new URL(normalizedPath, origin).href,
    robots: 'index,follow'
  }

  const title = normalizedPath.startsWith('/admin') ? 'Yönetim' :
    normalizedPath.startsWith('/urun/') ? 'Ürün Detayı' :
      normalizedPath === '/giris' ? 'Giriş' :
        normalizedPath === '/kayit' ? 'Kayıt' : 'Sayfa'
  return {
    title: `${title} | Efsane Baharat`,
    description: 'Efsane Baharat',
    canonical: null,
    robots: 'noindex,nofollow'
  }
}
