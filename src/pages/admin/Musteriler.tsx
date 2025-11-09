import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, Edit, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Musteriler() {
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [fiyatGruplari, setFiyatGruplari] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detayModalOpen, setDetayModalOpen] = useState(false)
  const [duzenlemeModalOpen, setDuzenlemeModalOpen] = useState(false)
  const [secilenMusteri, setSecilenMusteri] = useState<any>(null)
  const [formData, setFormData] = useState({
    fiyat_grubu_id: '',
    musteri_tipi: 'musteri'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    
    // Müşterileri ve fiyat gruplarını çek
    const [{ data: musteriData }, { data: fiyatData }] = await Promise.all([
      supabase.from('musteriler').select('*').order('created_at', { ascending: false }),
      supabase.from('fiyat_gruplari').select('*')
    ])
    
    if (musteriData && fiyatData) {
      // Müşterilere fiyat grubu bilgilerini ekle
      const musterilerWithFiyat = musteriData.map(musteri => ({
        ...musteri,
        fiyat_grubu: fiyatData.find(fg => fg.id === musteri.fiyat_grubu_id)
      }))
      
      setMusteriler(musterilerWithFiyat)
      setFiyatGruplari(fiyatData)
    }
    
    setLoading(false)
  }

  async function handleDuzenle(musteri: any) {
    setSecilenMusteri(musteri)
    setFormData({
      fiyat_grubu_id: musteri.fiyat_grubu_id || '',
      musteri_tipi: musteri.musteri_tipi || 'musteri'
    })
    setDuzenlemeModalOpen(true)
  }

  async function handleGuncelle(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const { error } = await supabase
        .from('musteriler')
        .update(formData)
        .eq('id', secilenMusteri.id)
      
      if (error) throw error
      
      toast.success('Müşteri bilgileri güncellendi!')
      setDuzenlemeModalOpen(false)
      await loadData()
    } catch (error: any) {
      console.error('Güncelleme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleDetayGor(musteri: any) {
    setSecilenMusteri(musteri)
    setDetayModalOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Müşteri Yönetimi</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : musteriler.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">Henüz müşteri bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri Tipi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat Grubu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {musteriler.map((musteri) => (
                <tr key={musteri.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {musteri.ad} {musteri.soyad}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{musteri.telefon || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${musteri.musteri_tipi === 'bayi' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {musteri.musteri_tipi === 'bayi' ? 'Bayi' : 'Müşteri'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {musteri.fiyat_grubu?.grup_adi || 'Atanmamış'}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleDetayGor(musteri)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4 inline" /> Detay
                    </button>
                    <button
                      onClick={() => handleDuzenle(musteri)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <Edit className="w-4 h-4 inline" /> Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detay Modal */}
      {detayModalOpen && secilenMusteri && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Müşteri Detayı</h2>
                <button onClick={() => setDetayModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ad</label>
                    <p className="text-gray-900">{secilenMusteri.ad}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Soyad</label>
                    <p className="text-gray-900">{secilenMusteri.soyad}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-gray-900">{secilenMusteri.telefon || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Müşteri Tipi</label>
                    <p className="text-gray-900">
                      {secilenMusteri.musteri_tipi === 'bayi' ? 'Bayi' : 'Müşteri'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Adres</label>
                    <p className="text-gray-900">{secilenMusteri.adres || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fiyat Grubu</label>
                    <p className="text-gray-900">{secilenMusteri.fiyat_grubu?.grup_adi || 'Atanmamış'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">İndirim Oranı</label>
                    <p className="text-gray-900">%{secilenMusteri.fiyat_grubu?.indirim_orani || 0}</p>
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

      {/* Düzenleme Modal */}
      {duzenlemeModalOpen && secilenMusteri && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Müşteri Düzenle: {secilenMusteri.ad} {secilenMusteri.soyad}
                </h2>
                <button onClick={() => setDuzenlemeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleGuncelle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Tipi</label>
                  <select
                    value={formData.musteri_tipi}
                    onChange={(e) => setFormData({ ...formData, musteri_tipi: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="musteri">Müşteri</option>
                    <option value="bayi">Bayi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fiyat Grubu</label>
                  <select
                    value={formData.fiyat_grubu_id}
                    onChange={(e) => setFormData({ ...formData, fiyat_grubu_id: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seçiniz</option>
                    {fiyatGruplari.map(fg => (
                      <option key={fg.id} value={fg.id}>
                        {fg.grup_adi} (İndirim: %{fg.indirim_orani})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition"
                  >
                    Güncelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuzenlemeModalOpen(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
