import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Tag, Calendar, Percent } from 'lucide-react'
import UrunKart from '../components/UrunKart'
import { useAuth } from '../contexts/AuthContext'

interface Kampanya {
  id: string
  kod: string
  ad: string
  aciklama: string
  indirim_tipi: 'yuzde' | 'tutar'
  indirim_degeri: number
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  kapsam: 'tum_urunler' | 'kategori' | 'marka' | 'secili_urunler'
  kategori_id?: string
  marka_id?: string
}

interface KampanyaWithProducts extends Kampanya {
  urunler: any[]
}

export default function Kampanyalar() {
  const { musteriData } = useAuth()
  const [kampanyalar, setKampanyalar] = useState<KampanyaWithProducts[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKampanyalarWithProducts()
  }, [])

  async function loadKampanyalarWithProducts() {
    try {
      setLoading(true)

      // Aktif kampanyaları getir (tum_urunler hariç - çok fazla ürün olabilir)
      const now = new Date().toISOString()
      const { data: kampanyalarData, error: kampanyalarError } = await supabase
        .from('kampanyalar')
        .select('*')
        .eq('aktif', true)
        .lte('baslangic_tarihi', now)
        .gte('bitis_tarihi', now)
        .neq('kapsam', 'tum_urunler') // Tüm ürünler kapsamındaki kampanyalar hariç
        .order('olusturma_tarihi', { ascending: false })

      if (kampanyalarError) throw kampanyalarError

      if (!kampanyalarData || kampanyalarData.length === 0) {
        setKampanyalar([])
        setLoading(false)
        return
      }

      // Her kampanya için ilgili ürünleri getir
      const kampanyalarWithProducts: KampanyaWithProducts[] = []

      for (const kampanya of kampanyalarData) {
        let urunler: any[] = []

        if (kampanya.kapsam === 'kategori' && kampanya.kategori_id) {
          const { data } = await supabase
            .from('urunler')
            .select('*')
            .eq('aktif_durum', true)
            .eq('kategori_id', kampanya.kategori_id)
            .limit(12)

          if (data) urunler = data
        } else if (kampanya.kapsam === 'marka' && kampanya.marka_id) {
          const { data } = await supabase
            .from('urunler')
            .select('*')
            .eq('aktif_durum', true)
            .eq('marka_id', kampanya.marka_id)
            .limit(12)

          if (data) urunler = data
        } else if (kampanya.kapsam === 'secili_urunler') {
          const { data: urunIds } = await supabase
            .from('kampanya_urunler')
            .select('urun_id')
            .eq('kampanya_id', kampanya.id)

          if (urunIds && urunIds.length > 0) {
            const ids = urunIds.map(u => u.urun_id)
            const { data } = await supabase
              .from('urunler')
              .select('*')
              .eq('aktif_durum', true)
              .in('id', ids)
              .limit(12)

            if (data) urunler = data
          }
        }

        // Ürün yoksa bu kampanyayı atlayabiliriz
        if (urunler.length === 0) continue

        // Ürünler için stok ve görsel bilgilerini çek
        const urunIds = urunler.map(u => u.id)

        const [{ data: gorseller }, { data: stoklar }, { data: kategorilerData }, { data: markalarData }] = await Promise.all([
          supabase.from('urun_gorselleri').select('*').in('urun_id', urunIds).order('sira_no'),
          supabase.from('urun_stoklari').select('*').in('urun_id', urunIds).eq('aktif_durum', true),
          supabase.from('kategoriler').select('id, kategori_adi').in('id', [...new Set(urunler.map(u => u.kategori_id))]),
          supabase.from('markalar').select('id, marka_adi').in('id', [...new Set(urunler.map(u => u.marka_id))])
        ])

        const musteriTipi = musteriData?.musteri_tipi || 'musteri'

        const urunlerWithData = urunler.map(urun => {
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

        kampanyalarWithProducts.push({
          ...kampanya,
          urunler: urunlerWithData
        })
      }

      setKampanyalar(kampanyalarWithProducts)
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 py-12">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Kampanyalı Ürünler</h1>
          <p className="text-lg opacity-90">Özel indirimler ve avantajlı fırsatları kaçırmayın!</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {kampanyalar.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Şu anda aktif kampanya bulunmuyor</h2>
            <p className="text-gray-500">Yeni kampanyalardan haberdar olmak için düzenli olarak kontrol edin.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {kampanyalar.map((kampanya) => (
              <div key={kampanya.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Kampanya Başlığı */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 border-b">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                          <Percent className="w-4 h-4" />
                          {kampanya.indirim_tipi === 'yuzde'
                            ? `%${kampanya.indirim_degeri} İndirim`
                            : `${kampanya.indirim_degeri} TL İndirim`}
                        </div>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                          {kampanya.kod}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{kampanya.ad}</h2>
                      {kampanya.aciklama && (
                        <p className="text-gray-600 mt-1">{kampanya.aciklama}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(kampanya.baslangic_tarihi)} - {formatDate(kampanya.bitis_tarihi)}</span>
                    </div>
                  </div>
                </div>

                {/* Kampanya Ürünleri */}
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {kampanya.urunler.map((urun) => (
                      <UrunKart
                        key={urun.id}
                        urun={urun}
                        kampanya={{
                          indirim_tipi: kampanya.indirim_tipi,
                          indirim_degeri: kampanya.indirim_degeri
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
