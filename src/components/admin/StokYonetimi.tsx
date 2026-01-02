import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  BIRIM_TURLERI, 
  getBirimSecenekleri, 
  ondalikStokGoster,
  birimUyumluMu,
  akilliBirimGoster
} from '../../utils/birimDonusturucu'

interface StokYonetimiProps {
  urunId: string
  urunAdi: string
}

export default function StokYonetimi({ urunId, urunAdi }: StokYonetimiProps) {
  const [stoklar, setStoklar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    birim_turu: 'gram',
    birim_adedi: 100,
    birim_adedi_turu: 'gram',
    fiyat: 0,
    stok_miktari: 0,
    stok_birimi: 'gram',
    min_siparis_miktari: 1,
    stok_grubu: 'hepsi',
    aktif_durum: true
  })

  useEffect(() => {
    loadStoklar()
  }, [urunId])

  async function loadStoklar() {
    setLoading(true)
    const { data } = await supabase
      .from('urun_stoklari')
      .select('*')
      .eq('urun_id', urunId)
      .order('created_at', { ascending: false })
    
    if (data) setStoklar(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Birim uyumluluğu kontrolü
    if (!birimUyumluMu(formData.birim_turu, formData.birim_adedi_turu)) {
      toast.error('Birim türü ve birim adedi uyumlu olmalı!')
      return
    }
    
    try {
      const stokData = {
        urun_id: urunId,
        birim_turu: formData.birim_turu,
        birim_adedi: formData.birim_adedi,
        birim_adedi_turu: formData.birim_adedi_turu,
        fiyat: formData.fiyat,
        stok_miktari: formData.stok_miktari,
        stok_birimi: formData.stok_birimi,
        min_siparis_miktari: formData.min_siparis_miktari,
        stok_grubu: formData.stok_grubu,
        aktif_durum: formData.aktif_durum
      }
      
      if (editingId) {
        const { error } = await supabase
          .from('urun_stoklari')
          .update(stokData)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success('Stok başarıyla güncellendi!')
      } else {
        const { error } = await supabase
          .from('urun_stoklari')
          .insert(stokData)
        
        if (error) throw error
        toast.success('Stok başarıyla eklendi!')
      }
      
      resetForm()
      await loadStoklar()
    } catch (error: any) {
      console.error('Stok kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu stok kaydını silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await supabase
        .from('urun_stoklari')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadStoklar()
      toast.success('Stok kaydı silindi!')
    } catch (error: any) {
      console.error('Stok silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(stok: any) {
    setEditingId(stok.id)
    setFormData({
      birim_turu: stok.birim_turu || 'gram',
      birim_adedi: stok.birim_adedi || 100,
      birim_adedi_turu: stok.birim_adedi_turu || 'gram',
      fiyat: stok.fiyat || 0,
      stok_miktari: stok.stok_miktari || 0,
      stok_birimi: stok.stok_birimi || stok.birim_turu || 'gram',
      min_siparis_miktari: stok.min_siparis_miktari || 1,
      stok_grubu: stok.stok_grubu || 'hepsi',
      aktif_durum: stok.aktif_durum !== false
    })
    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      birim_turu: 'gram',
      birim_adedi: 100,
      birim_adedi_turu: 'gram',
      fiyat: 0,
      stok_miktari: 0,
      stok_birimi: 'gram',
      min_siparis_miktari: 1,
      stok_grubu: 'hepsi',
      aktif_durum: true
    })
    setModalOpen(false)
  }

  // Birim türü değiştiğinde birim adedi türünü ve stok birimini güncelle
  const handleBirimTuruChange = (yeniBirim: string) => {
    setFormData(prev => ({
      ...prev,
      birim_turu: yeniBirim,
      birim_adedi_turu: yeniBirim,
      // Gram seçilirse stok birimi gram (kullanıcı değiştirebilir), diğerleri aynı
      stok_birimi: yeniBirim === 'gram' ? 'gram' : yeniBirim
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Package className="w-6 h-6 text-orange-600" />
            <span>Stok Yönetimi</span>
          </h3>
          <p className="text-gray-600 mt-1">{urunAdi}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Stok</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stoklar.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Henüz stok kaydı bulunmuyor</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birim</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min. Sipariş</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok Grubu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stoklar.map((stok) => (
                <tr key={stok.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">
                        {akilliBirimGoster(stok.birim_adedi || 100, stok.birim_adedi_turu || stok.birim_turu)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tür: {BIRIM_TURLERI.find(b => b.value === stok.birim_turu)?.label}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-orange-600">
                      {stok.fiyat?.toFixed(2)} ₺
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {ondalikStokGoster(stok.stok_miktari || 0, stok.stok_birimi || stok.birim_turu)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">
                      {stok.min_siparis_miktari || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      stok.stok_grubu === 'musteri' ? 'bg-blue-100 text-blue-800' :
                      stok.stok_grubu === 'bayi' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {stok.stok_grubu === 'musteri' ? 'Müşteri' :
                       stok.stok_grubu === 'bayi' ? 'Bayi' : 'Hepsi'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      stok.aktif_durum !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {stok.aktif_durum !== false ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(stok)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(stok.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Stok Düzenle' : 'Yeni Stok Ekle'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birim Türü *
                  </label>
                  <select
                    value={formData.birim_turu}
                    onChange={(e) => handleBirimTuruChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    {BIRIM_TURLERI.map(birim => (
                      <option key={birim.value} value={birim.value}>
                        {birim.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Birim adedi ve stok miktarı bu birimle tutulacak
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birim Adedi *
                    </label>
                    <input
                      type="number"
                      value={formData.birim_adedi}
                      onChange={(e) => setFormData({ ...formData, birim_adedi: parseFloat(e.target.value) || 0 })}
                      required
                      min="0"
                      step="0.001"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Örnek: 250, 1, 500
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birim Adedi Türü *
                    </label>
                    {formData.birim_turu === 'gram' ? (
                      <select
                        value={formData.birim_adedi_turu}
                        onChange={(e) => setFormData({ ...formData, birim_adedi_turu: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="gram">Gram</option>
                        <option value="kilogram">Kilogram</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={BIRIM_TURLERI.find(b => b.value === formData.birim_turu)?.label || ''}
                        disabled
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.birim_turu === 'gram' ? 'Gram veya Kilogram' : 'Birim türü ile aynı'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fiyat (₺) *
                  </label>
                  <input
                    type="number"
                    value={formData.fiyat}
                    onChange={(e) => setFormData({ ...formData, fiyat: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stok Miktarı *
                    </label>
                    <input
                      type="number"
                      value={formData.stok_miktari}
                      onChange={(e) => setFormData({ ...formData, stok_miktari: parseFloat(e.target.value) || 0 })}
                      required
                      min="0"
                      step="0.001"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ondalık değer girebilirsiniz (örn: 10.5)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stok Birimi *
                    </label>
                    {formData.birim_turu === 'gram' ? (
                      <select
                        value={formData.stok_birimi}
                        onChange={(e) => setFormData({ ...formData, stok_birimi: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="gram">Gram</option>
                        <option value="kilogram">Kilogram</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={BIRIM_TURLERI.find(b => b.value === formData.birim_turu)?.label || ''}
                        disabled
                        className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.birim_turu === 'gram' ? 'Gram veya Kilogram seçebilirsiniz' : 'Birim türü ile aynı'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min. Sipariş Miktarı
                    </label>
                    <input
                      type="number"
                      value={formData.min_siparis_miktari}
                      onChange={(e) => setFormData({ ...formData, min_siparis_miktari: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stok Grubu *
                    </label>
                    <select
                      value={formData.stok_grubu}
                      onChange={(e) => setFormData({ ...formData, stok_grubu: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="hepsi">Hepsi</option>
                      <option value="musteri">Müşteri</option>
                      <option value="bayi">Bayi</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Bu stok hangi gruba gösterilecek?
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aktif_durum}
                    onChange={(e) => setFormData({ ...formData, aktif_durum: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Aktif</label>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingId ? 'Güncelle' : 'Kaydet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
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
