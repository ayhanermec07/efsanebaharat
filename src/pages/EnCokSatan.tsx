import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TrendingUp, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Urun {
  id: string
  urun_adi: string
  aciklama: string
  kategori_id: string
  marka_id: string
  aktif: boolean
  kategori_adi?: string
  marka_adi?: string
}

interface UrunStok {
  id: string
  urun_id: string
  stok_tipi: string
  birim_fiyat: number
  bayi_fiyat: number
  stok_miktari: number
  aktif: boolean
}

interface UrunGorsel {
  gorsel_url: string
  sira: number
}

interface UrunWithDetails extends Urun {
  stoklar: UrunStok[]
  gorseller: UrunGorsel[]
  satis_sayisi?: number
  manuel_secim: boolean
}

export default function EnCokSatan() {
  const { musteriData } = useAuth()
  const [urunler, setUrunler] = useState<UrunWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [siralama, setSiralama] = useState<'otomatik' | 'manuel'>('otomatik')

  useEffect(() => {
    loadProducts()
  }, [siralama])

  async function loadProducts() {
    try {
      setLoading(true)

      if (siralama === 'manuel') {
        // Manuel seçilmiş ürünler
        const { data: onerilen, error: onerilenError } = await supabase
          .from('onerilen_urunler')
          .select('urun_id, goruntuleme_sirasi')
          .eq('manuel_secim', true)
          .order('goruntuleme_sirasi', { ascending: true })

        if (onerilenError) throw onerilenError

        if (onerilen && onerilen.length > 0) {
          const urunIds = onerilen.map(o => o.urun_id)
          await fetchProductDetails(urunIds, true)
        } else {
          setUrunler([])
        }
      } else {
        // Otomatik sıralama - en çok satılan ürünler
        // Satış verilerini siparis_urunleri tablosundan al
        const { data: satislar, error: satisError } = await supabase
          .from('siparis_urunleri')
          .select('urun_id, miktar')

        if (satisError) throw satisError

        // Ürün bazında toplam satış miktarını hesapla
        const satisSayilari: { [key: string]: number } = {}
        satislar?.forEach(satis => {
          if (!satisSayilari[satis.urun_id]) {
            satisSayilari[satis.urun_id] = 0
          }
          satisSayilari[satis.urun_id] += satis.miktar
        })

        // En çok satan 12 ürünü bul
        const enCokSatanIds = Object.entries(satisSayilari)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(entry => entry[0])

        if (enCokSatanIds.length > 0) {
          await fetchProductDetails(enCokSatanIds, false, satisSayilari)
        } else {
          // Hiç satış yoksa, aktif ürünlerden ilk 12'sini göster
          const { data: aktifUrunler } = await supabase
            .from('urunler')
            .select('id')
            .eq('aktif', true)
            .limit(12)

          if (aktifUrunler && aktifUrunler.length > 0) {
            await fetchProductDetails(aktifUrunler.map(u => u.id), false)
          }
        }
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProductDetails(
    urunIds: string[], 
    manuelSecim: boolean, 
    satisSayilari?: { [key: string]: number }
  ) {
    // Ürün bilgilerini al
    const { data: urunlerData, error: urunlerError } = await supabase
      .from('urunler')
      .select('*')
      .in('id', urunIds)
      .eq('aktif', true)

    if (urunlerError) throw urunlerError

    if (!urunlerData || urunlerData.length === 0) {
      setUrunler([])
      return
    }

    // Kategori ve marka bilgilerini al
    const kategoriIds = [...new Set(urunlerData.map(u => u.kategori_id))]
    const markaIds = [...new Set(urunlerData.map(u => u.marka_id))]

    const [kategorilerRes, markalarRes, stoklarRes, gorsellerRes] = await Promise.all([
      supabase.from('kategoriler').select('id, kategori_adi').in('id', kategoriIds),
      supabase.from('markalar').select('id, marka_adi').in('id', markaIds),
      supabase.from('urun_stoklari').select('*').in('urun_id', urunIds).eq('aktif', true),
      supabase.from('urun_gorselleri').select('*').in('urun_id', urunIds)
    ])

    // Verileri birleştir
    const urunlerWithDetails: UrunWithDetails[] = urunlerData.map(urun => {
      const kategori = kategorilerRes.data?.find(k => k.id === urun.kategori_id)
      const marka = markalarRes.data?.find(m => m.id === urun.marka_id)
      const stoklar = stoklarRes.data?.filter(s => s.urun_id === urun.id) || []
      const gorseller = gorsellerRes.data?.filter(g => g.urun_id === urun.id)
        .sort((a, b) => a.sira - b.sira) || []

      return {
        ...urun,
        kategori_adi: kategori?.kategori_adi,
        marka_adi: marka?.marka_adi,
        stoklar,
        gorseller,
        satis_sayisi: satisSayilari?.[urun.id] || 0,
        manuel_secim: manuelSecim
      }
    })

    // Sıralama
    if (satisSayilari) {
      urunlerWithDetails.sort((a, b) => (b.satis_sayisi || 0) - (a.satis_sayisi || 0))
    }

    setUrunler(urunlerWithDetails)
  }

  function getMinPrice(urun: UrunWithDetails) {
    if (!urun.stoklar || urun.stoklar.length === 0) return 0
    
    const isBayi = musteriData?.musteri_tipi === 'bayi'
    const prices = urun.stoklar.map(s => isBayi ? s.bayi_fiyat : s.birim_fiyat)
    return Math.min(...prices)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">En Çok Satan Ürünler</h1>
          </div>
          
          {/* Sıralama Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSiralama('otomatik')}
              className={`px-4 py-2 rounded-md transition ${
                siralama === 'otomatik'
                  ? 'bg-white shadow-sm text-orange-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Otomatik
            </button>
            <button
              onClick={() => setSiralama('manuel')}
              className={`px-4 py-2 rounded-md transition ${
                siralama === 'manuel'
                  ? 'bg-white shadow-sm text-orange-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Önerilen
            </button>
          </div>
        </div>
        
        <p className="text-gray-600">
          {siralama === 'otomatik' 
            ? 'Satış verilerine göre en çok tercih edilen ürünler'
            : 'Özel olarak seçilmiş ürünler'}
        </p>
      </div>

      {/* Ürün Listesi */}
      {urunler.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Henüz ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {urunler.map((urun, index) => {
            const minPrice = getMinPrice(urun)
            const mainImage = urun.gorseller[0]?.gorsel_url || '/placeholder.png'

            return (
              <Link
                key={urun.id}
                to={`/urun/${urun.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition group"
              >
                <div className="relative">
                  <img
                    src={mainImage}
                    alt={urun.urun_adi}
                    className="w-full h-64 object-cover rounded-t-lg"
                  />
                  
                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    {siralama === 'manuel' ? (
                      <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-current" />
                        <span>Önerilen</span>
                      </div>
                    ) : (
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        #{index + 1}
                      </div>
                    )}
                  </div>

                  {/* Satış Sayısı */}
                  {siralama === 'otomatik' && urun.satis_sayisi && urun.satis_sayisi > 0 && (
                    <div className="absolute top-3 right-3 bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                      {urun.satis_sayisi} satış
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition">
                    {urun.urun_adi}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{urun.kategori_adi}</span>
                    <span className="text-xs">{urun.marka_adi}</span>
                  </div>

                  {minPrice > 0 && (
                    <div className="text-xl font-bold text-orange-600">
                      {minPrice.toFixed(2)} ₺
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
