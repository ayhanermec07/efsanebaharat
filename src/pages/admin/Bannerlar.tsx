import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUpload } from '../../components/ImageUpload'

export default function Bannerlar() {
  const [bannerlar, setBannerlar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    banner_baslik: '',
    resim_url: '',
    link_url: '',
    sira_no: 0,
    aktif_durum: true
  })

  useEffect(() => {
    loadBannerlar()
  }, [])

  async function loadBannerlar() {
    setLoading(true)
    const { data } = await supabase
      .from('bannerlar')
      .select('*')
      .order('sira_no', { ascending: true })
    
    if (data) setBannerlar(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('bannerlar')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success('Banner başarıyla güncellendi!')
      } else {
        const { error } = await supabase
          .from('bannerlar')
          .insert(formData)
        
        if (error) throw error
        toast.success('Banner başarıyla eklendi!')
      }
      
      resetForm()
      await loadBannerlar()
    } catch (error: any) {
      console.error('Banner kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu banner\'ı silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await supabase
        .from('bannerlar')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await loadBannerlar()
      toast.success('Banner silindi!')
    } catch (error: any) {
      console.error('Banner silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(banner: any) {
    setEditingId(banner.id)
    setFormData({
      banner_baslik: banner.banner_baslik,
      resim_url: banner.resim_url,
      link_url: banner.link_url || '',
      sira_no: banner.sira_no || 0,
      aktif_durum: banner.aktif_durum
    })
    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      banner_baslik: '',
      resim_url: '',
      link_url: '',
      sira_no: 0,
      aktif_durum: true
    })
    setModalOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Banner Yönetimi</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Banner Ekle</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banner Başlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sıra No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bannerlar.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{banner.banner_baslik}</td>
                  <td className="px-6 py-4 text-sm">
                    {banner.resim_url && (
                      <img src={banner.resim_url} alt={banner.banner_baslik} className="h-12 w-24 object-cover rounded" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{banner.sira_no}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${banner.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {banner.aktif_durum ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 inline" /> Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Banner Düzenle' : 'Yeni Banner Ekle'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Başlık</label>
                  <input
                    type="text"
                    value={formData.banner_baslik}
                    onChange={(e) => setFormData({ ...formData, banner_baslik: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner Görseli</label>
                  <ImageUpload
                    maxFiles={1}
                    bucketName="banners"
                    onUploadComplete={(urls) => setFormData({ ...formData, resim_url: urls[0] || '' })}
                    existingImages={formData.resim_url ? [formData.resim_url] : []}
                    maxSizeMB={8}
                  />
                  <p className="text-xs text-gray-500 mt-2">Banner görseli yükleyin (maksimum 8MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link URL (Opsiyonel)</label>
                  <input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sıra No</label>
                  <input
                    type="number"
                    value={formData.sira_no}
                    onChange={(e) => setFormData({ ...formData, sira_no: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
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
