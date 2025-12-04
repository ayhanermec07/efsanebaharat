import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Package, X } from 'lucide-react'
import StokYonetimi from '../../components/admin/StokYonetimi'

interface StokAzalanUrun {
  id: string
  urun_id: string
  urun_adi: string
  birim_adedi: number
  birim_turu: string
  stok_miktari: number
  stok_birimi: string
  min_siparis_miktari: number
  kalan_birim_sayisi: number
}

export default function StokAzalan() {
  const [urunler, setUrunler] = useState<StokAzalanUrun[]>([])
  const [loading, setLoading] = useState(true)
  const [stokModalOpen, setStokModalOpen] = useState(false)
  const [selectedUrun, setSelectedUrun] = useState<{ id: string; adi: string } | null>(null)

  useEffect(() => {
    loadStokAzalanUrunler()
  }, [])

  async function loadStokAzalanUrunler() {
    setLoading(true)
    
    try {
      // Tüm aktif stokları çek
      const { data: stoklar } = await supabase
        .from('urun_stoklari')
        .select('*')
        .eq('aktif_durum', true)
      
      if (stoklar && stoklar.length > 0) {
        // Ürün bilgilerini çek
        const urunIds = [...new Set(stoklar.map(s => s.urun_id))]
        const { data: urunler } = await supabase
          .from('urunler')
          .select('id, urun_adi')
          .in('id', urunIds)
        
        // Stokları ürün bilgileriyle birleştir ve birim bazlı filtrele
        const stokAzalanUrunler = stoklar
          .map(stok => {
            const birimAdedi = stok.birim_adedi || 100
            const stokMiktari = stok.stok_miktari || 0
            const stokBirimi = stok.stok_birimi || stok.birim_turu
            const birimTuru = stok.birim_turu
            
            // Stok miktarını birim cinsine çevir
            let birimCinsindenStok = stokMiktari
            
            // Eğer stok birimi ile birim türü farklıysa dönüştür
            if (stokBirimi === 'kg' && birimTuru === 'gr') {
              birimCinsindenStok = stokMiktari * 1000 // kg'yi gr'a çevir
            } else if (stokBirimi === 'gr' && birimTuru === 'kg') {
              birimCinsindenStok = stokMiktari / 1000 // gr'yi kg'ye çevir
            }
            
            // Kaç birim kaldığını hesapla
            const kalanBirimSayisi = birimCinsindenStok / birimAdedi
            
            return {
              id: stok.id,
              urun_id: stok.urun_id,
              urun_adi: urunler?.find(u => u.id === stok.urun_id)?.urun_adi || 'Bilinmeyen Ürün',
              birim_adedi: birimAdedi,
              birim_turu: birimTuru,
              stok_miktari: stokMiktari,
              stok_birimi: stokBirimi,
              min_siparis_miktari: stok.min_siparis_miktari || 1,
              kalan_birim_sayisi: kalanBirimSayisi
            }
          })
          .filter(stok => stok.kalan_birim_sayisi < 3) // 3 birimden az olanları filtrele
          .sort((a, b) => a.kalan_birim_sayisi - b.kalan_birim_sayisi) // Küçükten büyüğe sırala
        
        setUrunler(stokAzalanUrunler)
      }
    } catch (error) {
      console.error('Stok azalan ürünler yükleme hatası:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <span>Stoğu Azalan Ürünler</span>
          </h1>
          <p className="text-gray-600 mt-2">Stoğu 3 birimden az olan ürünler (Küçükten büyüğe sıralı)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : urunler.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Tüm ürünlerin stok durumu iyi!</p>
          <p className="text-gray-400 text-sm mt-2">Stoğu 3 birimden az olan ürün bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Miktarı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalan Birim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {urunler.map((urun) => {
                const kalanBirim = urun.kalan_birim_sayisi
                const stokDurumu = kalanBirim === 0 
                  ? { text: 'Tükendi', color: 'bg-red-100 text-red-800' }
                  : kalanBirim < 1 
                  ? { text: 'Kritik', color: 'bg-red-100 text-red-800' }
                  : kalanBirim < 2
                  ? { text: 'Çok Az', color: 'bg-orange-100 text-orange-800' }
                  : { text: 'Az', color: 'bg-yellow-100 text-yellow-800' }
                
                return (
                  <tr key={urun.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{urun.urun_adi}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {urun.birim_adedi} {urun.birim_turu?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="font-semibold text-gray-900">
                          {urun.stok_miktari.toFixed(2)} {urun.stok_birimi?.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {kalanBirim.toFixed(2)} birim
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${stokDurumu.color}`}>
                        {stokDurumu.text}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedUrun({ id: urun.urun_id, adi: urun.urun_adi })
                          setStokModalOpen(true)
                        }}
                        className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                      >
                        Stok Ekle →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stok Yönetimi Modal */}
      {stokModalOpen && selectedUrun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedUrun.adi} - Stok Yönetimi
              </h2>
              <button
                onClick={() => {
                  setStokModalOpen(false)
                  setSelectedUrun(null)
                  loadStokAzalanUrunler() // Listeyi yenile
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <StokYonetimi
                urunId={selectedUrun.id}
                urunAdi={selectedUrun.adi}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
