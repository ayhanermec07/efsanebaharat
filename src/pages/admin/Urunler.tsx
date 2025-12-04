import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ImageUpload } from '../../components/ImageUpload'
import { Plus, Edit, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminSearchBar from '../../components/AdminSearchBar'

interface Urun {
  id: string
  urun_adi: string
  aciklama?: string
  fiyat: number
  kategori_id?: string
  marka_id?: string
  aktif: boolean
  ana_gorsel_url?: string
  urun_gorselleri?: string[]
  created_at: string
}

export default function Urunler() {
  const [urunler, setUrunler] = useState<Urun[]>([])
  const [filteredUrunler, setFilteredUrunler] = useState<Urun[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUrun, setEditingUrun] = useState<Urun | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    urun_adi: '',
    aciklama: '',
    fiyat: 0,
    kategori_id: '',
    marka_id: '',
    aktif: true,
    ana_gorsel_url: '',
    urun_gorselleri: [] as string[]
  })

  useEffect(() => {
    loadUrunler()
  }, [])

  async function loadUrunler() {
    setLoading(true)
    try {
      // Ürünleri ve ek görselleri birlikte çek
      const { data, error } = await supabase
        .from('urunler')
        .select(`
          *,
          urun_gorselleri (
            gorsel_url,
            sira_no
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Ürün gorselleri verilerini düzüzenle
      const formattedData = (data || []).map(urun => ({
        ...urun,
        urun_gorselleri: urun.urun_gorselleri?.map(g => g.gorsel_url) || []
      }))
      
      setUrunler(formattedData)
      setFilteredUrunler(formattedData)
    } catch (error) {
      console.error('Ürünler yükleme hatası:', error)
      toast.error('Ürünler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handleNewUrun() {
    setEditingUrun(null)
    setFormData({
      urun_adi: '',
      aciklama: '',
      fiyat: 0,
      kategori_id: '',
      marka_id: '',
      aktif: true,
      ana_gorsel_url: '',
      urun_gorselleri: []
    })
    setShowModal(true)
  }

  function handleEditUrun(urun: Urun) {
    setEditingUrun(urun)
    // Ek görselleri string array'e çevir
    const ekGorseller = urun.urun_gorselleri || []
    
    setFormData({
      urun_adi: urun.urun_adi,
      aciklama: urun.aciklama || '',
      fiyat: urun.fiyat,
      kategori_id: urun.kategori_id || '',
      marka_id: urun.marka_id || '',
      aktif: urun.aktif,
      ana_gorsel_url: urun.ana_gorsel_url || '',
      urun_gorselleri: Array.isArray(ekGorseller) ? ekGorseller : []
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      let urunId: string
      
      if (editingUrun) {
        // Güncelleme
        const { data, error } = await supabase
          .from('urunler')
          .update({
            urun_adi: formData.urun_adi,
            aciklama: formData.aciklama,
            fiyat: formData.fiyat,
            kategori_id: formData.kategori_id || null,
            marka_id: formData.marka_id || null,
            aktif: formData.aktif,
            ana_gorsel_url: formData.ana_gorsel_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUrun.id)
          .select()
          .single()

        if (error) throw error
        urunId = editingUrun.id
        toast.success('Ürün başarıyla güncellendi')
      } else {
        // Yeni ekleme
        const { data, error } = await supabase
          .from('urunler')
          .insert({
            urun_adi: formData.urun_adi,
            aciklama: formData.aciklama,
            fiyat: formData.fiyat,
            kategori_id: formData.kategori_id || null,
            marka_id: formData.marka_id || null,
            aktif: formData.aktif,
            ana_gorsel_url: formData.ana_gorsel_url || null
          })
          .select()
          .single()

        if (error) throw error
        urunId = data.id
        toast.success('Ürün başarıyla eklendi')
      }

      // Ek görselleri kaydet
      if (formData.urun_gorselleri.length > 0) {
        // Mevcut ek görselleri sil
        await supabase
          .from('urun_gorselleri')
          .delete()
          .eq('urun_id', urunId)

        // Yeni ek görselleri ekle
        const urunGorselleriData = formData.urun_gorselleri.map((url, index) => ({
          urun_id: urunId,
          gorsel_url: url,
          gorsel_adi: `Ek Görsel ${index + 1}`,
          sira_no: index + 1
        }))

        const { error: gorselError } = await supabase
          .from('urun_gorselleri')
          .insert(urunGorselleriData)

        if (gorselError) {
          console.error('Ek görsel kaydetme hatası:', gorselError)
          toast.error('Ek görseller kaydedilirken hata oluştu')
        }
      }

      setShowModal(false)
      loadUrunler()
    } catch (error) {
      console.error('Ürün kaydetme hatası:', error)
      toast.error('Ürün kaydedilirken hata oluştu')
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setFilteredUrunler(urunler)
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = urunler.filter(urun => {
      const urunAdi = urun.urun_adi.toLowerCase()
      const aciklama = (urun.aciklama || '').toLowerCase()
      const fiyat = urun.fiyat.toString()
      
      return (
        urunAdi.includes(lowerQuery) ||
        aciklama.includes(lowerQuery) ||
        fiyat.includes(lowerQuery)
      )
    })

    setFilteredUrunler(filtered)
  }

  function handleClearSearch() {
    setSearchQuery('')
    setFilteredUrunler(urunler)
  }

  const suggestions = urunler.map(u => u.urun_adi)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Package className="w-8 h-8 text-orange-600" />
            <span>Ürünler</span>
          </h1>
          <button 
            onClick={handleNewUrun}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Ürün</span>
          </button>
        </div>
        
        <AdminSearchBar
          placeholder="Ürün adı, açıklama, fiyat ile ara..."
          onSearch={handleSearch}
          onClear={handleClearSearch}
          suggestions={suggestions}
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredUrunler.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">
            {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz ürün bulunmuyor'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              {filteredUrunler.length} ürün gösteriliyor
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Görsel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUrunler.map((urun) => (
                <tr key={urun.id}>
                  <td className="px-6 py-4">
                    {urun.ana_gorsel_url ? (
                      <img
                        src={urun.ana_gorsel_url}
                        alt={urun.urun_adi}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{urun.urun_adi}</div>
                      {urun.aciklama && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {urun.aciklama.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ₺{urun.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      urun.aktif 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {urun.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button 
                      onClick={() => handleEditUrun(urun)}
                      className="text-blue-600 hover:text-blue-700 mr-4 flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Düzenle</span>
                    </button>
                    <button className="text-red-600 hover:text-red-700 flex items-center space-x-1">
                      <Trash2 className="w-4 h-4" />
                      <span>Sil</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingUrun ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı
                </label>
                <input
                  type="text"
                  value={formData.urun_adi}
                  onChange={(e) => setFormData({ ...formData, urun_adi: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.aciklama}
                  onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fiyat
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fiyat}
                  onChange={(e) => setFormData({ ...formData, fiyat: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ana Görsel
                </label>
                <ImageUpload
                  maxFiles={1}
                  bucketName="urun-gorselleri"
                  onUploadComplete={(urls) => setFormData({ ...formData, ana_gorsel_url: urls[0] || '' })}
                  existingImages={formData.ana_gorsel_url ? [formData.ana_gorsel_url] : []}
                  maxSizeMB={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ek Görseller
                </label>
                <ImageUpload
                  maxFiles={5}
                  bucketName="urun-gorselleri"
                  onUploadComplete={(urls) => setFormData({ ...formData, urun_gorselleri: urls })}
                  existingImages={formData.urun_gorselleri || []}
                  maxSizeMB={8}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="aktif"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="aktif" className="text-sm font-medium text-gray-700">
                  Ürün Aktif
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition"
                >
                  {editingUrun ? 'Güncelle' : 'Ekle'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
