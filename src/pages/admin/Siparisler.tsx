import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Siparisler() {
  const [siparisler, setSiparisler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detayModalOpen, setDetayModalOpen] = useState(false)
  const [secilenSiparis, setSecilenSiparis] = useState<any>(null)

  useEffect(() => {
    loadSiparisler()
  }, [])

  async function loadSiparisler() {
    setLoading(true)
    
    try {
      // Siparişleri çek
      const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })
      
      if (error) {
        console.error('Sipariş yükleme hatası:', error)
        setSiparisler([])
        setLoading(false)
        return
      }
      
      if (siparisData && siparisData.length > 0) {
        // Müşteri bilgilerini çek
        const musteriIds = [...new Set(siparisData.map(s => s.musteri_id))]
        const { data: musteriler } = await supabase
          .from('musteriler')
          .select('id, ad, soyad')
          .in('id', musteriIds)
        
        // Siparişlere müşteri bilgilerini ekle
        const siparislerWithMusteriler = siparisData.map(siparis => ({
          ...siparis,
          musteri: musteriler?.find(m => m.id === siparis.musteri_id)
        }))
        
        setSiparisler(siparislerWithMusteriler)
      } else {
        setSiparisler([])
      }
    } catch (error) {
      console.error('Sipariş yükleme hatası:', error)
      setSiparisler([])
    }
    
    setLoading(false)
  }

  async function handleDurumGuncelle(siparisId: string, yeniDurum: string) {
    try {
      const { error } = await supabase
        .from('siparisler')
        .update({ siparis_durumu: yeniDurum })
        .eq('id', siparisId)
      
      if (error) throw error
      
      await loadSiparisler()
      toast.success('Sipariş durumu güncellendi!')
    } catch (error: any) {
      console.error('Durum güncelleme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDetayGor(siparis: any) {
    try {
      // Sipariş ürünlerini çek
      const { data: siparisUrunleri } = await supabase
        .from('siparis_urunleri')
        .select('*')
        .eq('siparis_id', siparis.id)
      
      if (siparisUrunleri && siparisUrunleri.length > 0) {
        // Ürün bilgilerini çek
        const urunIds = [...new Set(siparisUrunleri.map(su => su.urun_id))]
        const { data: urunler } = await supabase
          .from('urunler')
          .select('id, urun_adi')
          .in('id', urunIds)
        
        // Sipariş ürünlerine ürün bilgilerini ekle
        const detayliSiparisUrunleri = siparisUrunleri.map(su => ({
          ...su,
          urun: urunler?.find(u => u.id === su.urun_id)
        }))
        
        setSecilenSiparis({
          ...siparis,
          siparis_urunleri: detayliSiparisUrunleri
        })
      } else {
        setSecilenSiparis({
          ...siparis,
          siparis_urunleri: []
        })
      }
      
      setDetayModalOpen(true)
    } catch (error: any) {
      console.error('Detay görüntüleme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  const durum_renkleri: any = {
    'beklemede': 'bg-yellow-100 text-yellow-800',
    'hazirlaniyor': 'bg-blue-100 text-blue-800',
    'kargoda': 'bg-purple-100 text-purple-800',
    'teslim_edildi': 'bg-green-100 text-green-800',
    'iptal_edildi': 'bg-red-100 text-red-800'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sipariş Yönetimi</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : siparisler.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">Henüz sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş Durumu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Durumu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {siparisler.map((siparis) => (
                <tr key={siparis.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{siparis.siparis_no}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {siparis.musteri?.ad} {siparis.musteri?.soyad}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    {siparis.toplam_tutar?.toFixed(2)} ₺
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      value={siparis.siparis_durumu}
                      onChange={(e) => handleDurumGuncelle(siparis.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs border-0 ${durum_renkleri[siparis.siparis_durumu] || 'bg-gray-100 text-gray-800'}`}
                    >
                      <option value="beklemede">Beklemede</option>
                      <option value="hazirlaniyor">Hazırlanıyor</option>
                      <option value="kargoda">Kargoda</option>
                      <option value="teslim_edildi">Teslim Edildi</option>
                      <option value="iptal_edildi">İptal Edildi</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${siparis.odeme_durumu === 'odendi' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {siparis.odeme_durumu === 'odendi' ? 'Ödendi' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDetayGor(siparis)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4 inline" /> Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detay Modal */}
      {detayModalOpen && secilenSiparis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Sipariş Detayı #{secilenSiparis.siparis_no}
                </h2>
                <button onClick={() => setDetayModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Müşteri Bilgileri */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Müşteri Bilgileri</h3>
                  <p className="text-sm text-gray-600">
                    {secilenSiparis.musteri?.ad} {secilenSiparis.musteri?.soyad}
                  </p>
                </div>

                {/* Sipariş Ürünleri */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Sipariş Ürünleri</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ürün</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Birim</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Miktar</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Birim Fiyat</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {secilenSiparis.siparis_urunleri?.map((su: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{su.urun?.urun_adi}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{su.birim_turu}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{su.miktar}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{su.birim_fiyat?.toFixed(2)} ₺</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {(su.miktar * su.birim_fiyat).toFixed(2)} ₺
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Toplam */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Genel Toplam:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {secilenSiparis.toplam_tutar?.toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setDetayModalOpen(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
