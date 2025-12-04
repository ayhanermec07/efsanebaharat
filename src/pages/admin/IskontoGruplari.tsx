import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X, Percent } from 'lucide-react'
import toast from 'react-hot-toast'

export default function IskontoGruplari() {
  const [gruplar, setGruplar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    grup_adi: '',
    aciklama: '',
    indirim_orani: 0,
    aktif_durum: true
  })

  useEffect(() => {
    loadGruplar()
  }, [])

  async function loadGruplar() {
    setLoading(true)
    const { data } = await supabase
      .from('fiyat_gruplari')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setGruplar(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('fiyat_gruplari')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success('İskonto grubu başarıyla güncellendi!')
      } else {
        const { error } = await supabase
          .from('fiyat_gruplari')
          .insert(formData)
        
        if (error) throw error
        toast.success('İskonto grubu başarıyla eklendi!')
      }
      
      resetForm()
      await loadGruplar()
    } catch (error: any) {
      console.error('İskonto grubu kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu iskonto grubunu silmek istediğinizden emin misiniz?')) return
    
    try {
      // Önce bu grubu kullanan müşteri var mı kontrol et
      const { data: musteriler } = await supabase
        .from('musteriler')
        .select('id')
        .eq('fiyat_grubu_id', id)
        .limit(1)
      
      if (musteriler && musteriler.length > 0) {
        toast.error('Bu iskonto grubunu kullanan müşteriler var. Önce müşterilerin grubunu değiştirin.')
        return
      }
      
      const { error } = await supabase
        .from('fiyat_gruplari')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadGruplar()
      toast.success('İskonto grubu silindi!')
    } catch (error: any) {
      console.error('İskonto grubu silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(grup: any) {
    setEditingId(grup.id)
    setFormData({
      grup_adi: grup.grup_adi,
      aciklama: grup.aciklama || '',
      indirim_orani: grup.indirim_orani || 0,
      aktif_durum: grup.aktif_durum
    })
    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      grup_adi: '',
      aciklama: '',
      indirim_orani: 0,
      aktif_durum: true
    })
    setModalOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Percent className="w-8 h-8 text-orange-600" />
            <span>İskonto Grupları</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Müşteri ve bayi iskonto gruplarını yönetin. Her yeni müşteri otomatik olarak "Müşteri İskonto Grubu"na atanır.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Grup Ekle</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gruplar.map((grup) => (
            <div
              key={grup.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{grup.grup_adi}</h3>
                  {grup.aciklama && (
                    <p className="text-sm text-gray-600">{grup.aciklama}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${grup.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {grup.aktif_durum ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-orange-600">
                    %{grup.indirim_orani || 0}
                  </span>
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">İndirim Oranı</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(grup)}
                  className="flex-1 flex items-center justify-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span>Düzenle</span>
                </button>
                <button
                  onClick={() => handleDelete(grup.id)}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'İskonto Grubu Düzenle' : 'Yeni İskonto Grubu Ekle'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grup Adı *
                  </label>
                  <input
                    type="text"
                    value={formData.grup_adi}
                    onChange={(e) => setFormData({ ...formData, grup_adi: e.target.value })}
                    required
                    placeholder="Örn: Müşteri İskonto Grubu"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.aciklama}
                    onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                    rows={3}
                    placeholder="Grup hakkında açıklama..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İndirim Oranı (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.indirim_orani}
                      onChange={(e) => setFormData({ ...formData, indirim_orani: parseFloat(e.target.value) || 0 })}
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <Percent className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0 ile 100 arasında bir değer girin</p>
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
                    <Save className="w-5 h-5" />
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
