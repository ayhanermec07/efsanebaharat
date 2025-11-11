import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Users,
  Store,
  Tag,
  Calendar,
  Search
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Iskonto {
  id: string
  iskonto_adi: string
  iskonto_tipi: 'musteri' | 'bayi' | 'grup' | 'musteri_tipi_grubu'
  hedef_id: string | null
  hedef_adi: string
  iskonto_orani: number
  baslangic_tarihi: string
  bitis_tarihi: string | null
  aktif: boolean
  aciklama: string
  musteri_tipi?: 'musteri' | 'bayi'
}

interface Musteri {
  id: string
  ad: string
  soyad: string
  email: string
}

interface Bayi {
  id: string
  bayi_adi: string
  email: string
}

export default function Iskonto() {
  const [iskontolar, setIskontolar] = useState<Iskonto[]>([])
  const [musteriler, setMusteriler] = useState<Musteri[]>([])
  const [bayiler, setBayiler] = useState<Bayi[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterTip, setFilterTip] = useState<'all' | 'musteri' | 'bayi' | 'grup' | 'musteri_tipi_grubu'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    iskonto_adi: '',
    iskonto_tipi: 'musteri' as 'musteri' | 'bayi' | 'grup' | 'musteri_tipi_grubu',
    hedef_id: '',
    iskonto_orani: 0,
    baslangic_tarihi: new Date().toISOString().split('T')[0],
    bitis_tarihi: '',
    aktif: true,
    aciklama: '',
    grup_hedef_tipi: 'musteri' as 'musteri' | 'bayi',
    musteri_tipi_secimi: 'musteri' as 'musteri' | 'bayi'
  })
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    await Promise.all([
      loadIskontolar(),
      loadMusteriler(),
      loadBayiler()
    ])
    setLoading(false)
  }

  async function loadIskontolar() {
    try {
      const { data, error } = await supabase
        .from('iskontolar')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })
      
      if (error) throw error
      setIskontolar(data || [])
    } catch (error: any) {
      console.error('İskontolar yüklenemedi:', error)
      toast.error('İskontolar yüklenemedi: ' + error.message)
      setIskontolar([])
    }
  }

  async function loadMusteriler() {
    try {
      const { data, error } = await supabase
        .from('musteriler')
        .select('id, ad, soyad, telefon')
        .order('ad')
      
      if (error) {
        console.error('Müşteriler yükleme hatası:', error)
        toast.error('Müşteriler yüklenemedi: ' + error.message)
        setMusteriler([])
      } else if (data && data.length > 0) {
        setMusteriler(data.map(m => ({
          id: m.id,
          ad: m.ad,
          soyad: m.soyad,
          email: m.telefon || 'Telefon yok'
        })))
        console.log(`${data.length} müşteri yüklendi`)
      } else {
        console.log('Veritabanında müşteri bulunamadı')
        setMusteriler([])
      }
    } catch (error: any) {
      console.error('Müşteriler yüklenemedi:', error)
      toast.error('Müşteriler yüklenirken hata oluştu')
      setMusteriler([])
    }
  }

  async function loadBayiler() {
    try {
      const { data, error } = await supabase
        .from('bayiler')
        .select('id, bayi_adi, email')
        .order('bayi_adi')
      
      if (error) {
        console.error('Bayiler yükleme hatası:', error)
        toast.error('Bayiler yüklenemedi: ' + error.message)
        setBayiler([])
      } else if (data && data.length > 0) {
        setBayiler(data.map(b => ({
          id: b.id,
          bayi_adi: b.bayi_adi,
          email: b.email
        })))
        console.log(`${data.length} bayi yüklendi`)
      } else {
        console.log('Veritabanında bayi bulunamadı')
        setBayiler([])
      }
    } catch (error: any) {
      console.error('Bayiler yüklenemedi:', error)
      toast.error('Bayiler yüklenirken hata oluştu')
      setBayiler([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (formData.iskonto_orani <= 0 || formData.iskonto_orani > 100) {
      toast.error('İskonto oranı 0-100 arasında olmalıdır')
      return
    }

    try {
      if (formData.iskonto_tipi === 'grup' && selectedItems.length === 0) {
        toast.error('Lütfen en az bir hedef seçin')
        return
      }

      // Müşteri tipi grubuna göre iskonto
      if (formData.iskonto_tipi === 'musteri_tipi_grubu') {
        // Seçilen müşteri tipine göre tüm müşterileri getir
        const { data: tumMusteriler, error } = await supabase
          .from('musteriler')
          .select('id, ad, soyad, musteri_tipi')
          .eq('musteri_tipi', formData.musteri_tipi_secimi)

        if (error) {
          toast.error('Müşteriler yüklenemedi: ' + error.message)
          return
        }

        if (!tumMusteriler || tumMusteriler.length === 0) {
          toast.error(`${formData.musteri_tipi_secimi === 'musteri' ? 'Müşteri' : 'Bayi'} tipinde kayıt bulunamadı`)
          return
        }

        // Her müşteri için iskonto oluştur ve Supabase'e kaydet
        const iskontolar = tumMusteriler.map(musteri => ({
          iskonto_adi: formData.iskonto_adi,
          iskonto_tipi: formData.iskonto_tipi,
          hedef_id: musteri.id,
          hedef_adi: `${musteri.ad} ${musteri.soyad}`,
          iskonto_orani: formData.iskonto_orani,
          baslangic_tarihi: formData.baslangic_tarihi,
          bitis_tarihi: formData.bitis_tarihi || null,
          aktif: formData.aktif,
          aciklama: formData.aciklama,
          musteri_tipi: formData.musteri_tipi_secimi
        }))

        const { error: insertError } = await supabase
          .from('iskontolar')
          .insert(iskontolar)

        if (insertError) throw insertError

        toast.success(`${tumMusteriler.length} ${formData.musteri_tipi_secimi === 'musteri' ? 'müşteri' : 'bayi'} için iskonto oluşturuldu`)
        await loadIskontolar()
      }
      // Grup iskonto için her seçili müşteri için ayrı kayıt oluştur ve Supabase'e kaydet
      else if (formData.iskonto_tipi === 'grup') {
        const iskontolar = selectedItems.map(hedefId => {
          const musteri = musteriler.find(m => m.id === hedefId)
          return {
            iskonto_adi: formData.iskonto_adi,
            iskonto_tipi: formData.iskonto_tipi,
            hedef_id: hedefId,
            hedef_adi: musteri ? `${musteri.ad} ${musteri.soyad}` : '',
            iskonto_orani: formData.iskonto_orani,
            baslangic_tarihi: formData.baslangic_tarihi,
            bitis_tarihi: formData.bitis_tarihi || null,
            aktif: formData.aktif,
            aciklama: formData.aciklama
          }
        })

        const { error: insertError } = await supabase
          .from('iskontolar')
          .insert(iskontolar)

        if (insertError) throw insertError

        toast.success(`${selectedItems.length} müşteri için iskonto oluşturuldu`)
        await loadIskontolar()
      } else {
        // Tekil iskonto - Supabase'e kaydet
        const hedefAdi = formData.iskonto_tipi === 'musteri'
          ? musteriler.find(m => m.id === formData.hedef_id)?.ad + ' ' + musteriler.find(m => m.id === formData.hedef_id)?.soyad
          : bayiler.find(b => b.id === formData.hedef_id)?.bayi_adi

        if (editingId) {
          const { error: updateError } = await supabase
            .from('iskontolar')
            .update({
              iskonto_adi: formData.iskonto_adi,
              iskonto_orani: formData.iskonto_orani,
              baslangic_tarihi: formData.baslangic_tarihi,
              bitis_tarihi: formData.bitis_tarihi || null,
              aktif: formData.aktif,
              aciklama: formData.aciklama,
              guncelleme_tarihi: new Date().toISOString()
            })
            .eq('id', editingId)

          if (updateError) throw updateError
          toast.success('İskonto güncellendi')
          await loadIskontolar()
        } else {
          const { error: insertError } = await supabase
            .from('iskontolar')
            .insert([{
              iskonto_adi: formData.iskonto_adi,
              iskonto_tipi: formData.iskonto_tipi,
              hedef_id: formData.hedef_id,
              hedef_adi: hedefAdi || '',
              iskonto_orani: formData.iskonto_orani,
              baslangic_tarihi: formData.baslangic_tarihi,
              bitis_tarihi: formData.bitis_tarihi || null,
              aktif: formData.aktif,
              aciklama: formData.aciklama
            }])

          if (insertError) throw insertError
          toast.success('İskonto oluşturuldu')
          await loadIskontolar()
        }
      }

      resetForm()
    } catch (error: any) {
      console.error('İskonto kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu iskonto kaydını silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('iskontolar')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('İskonto silindi')
      await loadIskontolar()
    } catch (error: any) {
      console.error('İskonto silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(iskonto: Iskonto) {
    setEditingId(iskonto.id)
    setFormData({
      iskonto_adi: iskonto.iskonto_adi,
      iskonto_tipi: iskonto.iskonto_tipi,
      hedef_id: iskonto.hedef_id || '',
      iskonto_orani: iskonto.iskonto_orani,
      baslangic_tarihi: iskonto.baslangic_tarihi,
      bitis_tarihi: iskonto.bitis_tarihi || '',
      aktif: iskonto.aktif,
      aciklama: iskonto.aciklama,
      grup_hedef_tipi: 'musteri',
      musteri_tipi_secimi: iskonto.musteri_tipi || 'musteri'
    })
    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      iskonto_adi: '',
      iskonto_tipi: 'musteri',
      hedef_id: '',
      iskonto_orani: 0,
      baslangic_tarihi: new Date().toISOString().split('T')[0],
      bitis_tarihi: '',
      aktif: true,
      aciklama: '',
      grup_hedef_tipi: 'musteri',
      musteri_tipi_secimi: 'musteri'
    })
    setSelectedItems([])
    setModalOpen(false)
  }

  const filteredIskontolar = iskontolar.filter(iskonto => {
    const matchesFilter = filterTip === 'all' || iskonto.iskonto_tipi === filterTip
    const matchesSearch = iskonto.iskonto_adi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         iskonto.hedef_adi.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleItemToggle = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">İskonto Yönetimi</h1>
          <p className="text-gray-600 mt-2">Müşteri ve bayi gruplarına özel indirimler tanımlayın</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yeni İskonto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İskonto veya hedef ara..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTip('all')}
              className={`px-4 py-2 rounded-lg transition ${
                filterTip === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterTip('musteri')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                filterTip === 'musteri'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Müşteri
            </button>
            <button
              onClick={() => setFilterTip('bayi')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                filterTip === 'bayi'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Store className="w-4 h-4" />
              Bayi
            </button>
            <button
              onClick={() => setFilterTip('grup')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                filterTip === 'grup'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-4 h-4" />
              Grup
            </button>
          </div>
        </div>
      </div>

      {/* İskonto Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İskonto Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih Aralığı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredIskontolar.map((iskonto) => (
                <tr key={iskonto.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{iskonto.iskonto_adi}</div>
                    {iskonto.aciklama && (
                      <div className="text-xs text-gray-500">{iskonto.aciklama}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      iskonto.iskonto_tipi === 'musteri' ? 'bg-blue-100 text-blue-700' :
                      iskonto.iskonto_tipi === 'bayi' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {iskonto.iskonto_tipi === 'musteri' ? <Users className="w-3 h-3" /> :
                       iskonto.iskonto_tipi === 'bayi' ? <Store className="w-3 h-3" /> :
                       <Tag className="w-3 h-3" />}
                      {iskonto.iskonto_tipi === 'musteri' ? 'Müşteri' :
                       iskonto.iskonto_tipi === 'bayi' ? 'Bayi' : 'Grup'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{iskonto.hedef_adi}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-lg font-bold text-orange-600">
                      <Percent className="w-4 h-4" />
                      {iskonto.iskonto_orani}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(iskonto.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                      {iskonto.bitis_tarihi && (
                        <>
                          <span>-</span>
                          <span>{new Date(iskonto.bitis_tarihi).toLocaleDateString('tr-TR')}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      iskonto.aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {iskonto.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(iskonto)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(iskonto.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIskontolar.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Henüz iskonto kaydı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'İskonto Düzenle' : 'Yeni İskonto Oluştur'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İskonto Adı *
                  </label>
                  <input
                    type="text"
                    value={formData.iskonto_adi}
                    onChange={(e) => setFormData({ ...formData, iskonto_adi: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Örn: VIP Müşteri İndirimi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İskonto Tipi *
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iskonto_tipi: 'musteri', hedef_id: '' })
                        setSelectedItems([])
                      }}
                      className={`p-4 border-2 rounded-lg transition ${
                        formData.iskonto_tipi === 'musteri'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-sm font-medium">Tekil Müşteri</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iskonto_tipi: 'bayi', hedef_id: '' })
                        setSelectedItems([])
                      }}
                      className={`p-4 border-2 rounded-lg transition ${
                        formData.iskonto_tipi === 'bayi'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Store className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-sm font-medium">Tekil Bayi</div>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iskonto_tipi: 'grup', hedef_id: '', grup_hedef_tipi: 'musteri' })
                        setSelectedItems([])
                      }}
                      className={`p-4 border-2 rounded-lg transition ${
                        formData.iskonto_tipi === 'grup'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Tag className="w-6 h-6 mx-auto mb-2 text-green-600" />
                      <div className="text-sm font-medium">Müşteri Grubu</div>
                      <div className="text-xs text-gray-500 mt-1">Seçili müşteriler</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, iskonto_tipi: 'musteri_tipi_grubu', hedef_id: '' })
                        setSelectedItems([])
                      }}
                      className={`p-4 border-2 rounded-lg transition ${
                        formData.iskonto_tipi === 'musteri_tipi_grubu'
                          ? 'border-orange-600 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                      <div className="text-sm font-medium">Müşteri Tipi Grubu</div>
                      <div className="text-xs text-gray-500 mt-1">Tüm müşteri/bayi</div>
                    </button>
                  </div>
                </div>

                {/* Müşteri Tipi Grubu Seçimi */}
                {formData.iskonto_tipi === 'musteri_tipi_grubu' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri Tipi Seçimi *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, musteri_tipi_secimi: 'musteri' })}
                        className={`p-4 border-2 rounded-lg transition ${
                          formData.musteri_tipi_secimi === 'musteri'
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-sm font-medium">Tüm Müşteriler</div>
                        <div className="text-xs text-gray-500 mt-1">Müşteri tipindeki herkese</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, musteri_tipi_secimi: 'bayi' })}
                        className={`p-4 border-2 rounded-lg transition ${
                          formData.musteri_tipi_secimi === 'bayi'
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Store className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-sm font-medium">Tüm Bayiler</div>
                        <div className="text-xs text-gray-500 mt-1">Bayi tipindeki herkese</div>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Seçilen müşteri tipindeki tüm kayıtlara iskonto uygulanacak
                    </p>
                  </div>
                )}

                {/* Hedef Seçimi */}
                {formData.iskonto_tipi !== 'grup' && formData.iskonto_tipi !== 'musteri_tipi_grubu' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.iskonto_tipi === 'musteri' ? 'Müşteri Seç *' : 'Bayi Seç *'}
                    </label>
                    <select
                      value={formData.hedef_id}
                      onChange={(e) => setFormData({ ...formData, hedef_id: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Seçiniz...</option>
                      {formData.iskonto_tipi === 'musteri'
                        ? musteriler.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.ad} {m.soyad} {m.email && m.email !== 'Telefon yok' ? `(${m.email})` : ''}
                            </option>
                          ))
                        : bayiler.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.bayi_adi} ({b.email})
                            </option>
                          ))
                      }
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri Grubu Seçimi * (Çoklu seçim yapabilirsiniz)
                    </label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {musteriler.length > 0 ? (
                        musteriler.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => handleItemToggle(item.id)}
                              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm">
                              {item.ad} {item.soyad}
                              {item.email && item.email !== 'Telefon yok' && (
                                <span className="text-gray-500 ml-2">({item.email})</span>
                              )}
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Henüz müşteri kaydı bulunmuyor</p>
                          <p className="text-xs mt-1">Önce müşteri ekleyin</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedItems.length} müşteri seçildi
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İskonto Oranı (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.iskonto_orani}
                      onChange={(e) => setFormData({ ...formData, iskonto_orani: parseFloat(e.target.value) })}
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0 ile 100 arasında bir değer girin</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Tarihi *
                    </label>
                    <input
                      type="date"
                      value={formData.baslangic_tarihi}
                      onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Tarihi (Opsiyonel)
                    </label>
                    <input
                      type="date"
                      value={formData.bitis_tarihi}
                      onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                      min={formData.baslangic_tarihi}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.aciklama}
                    onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="İskonto hakkında açıklama..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.aktif}
                    onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">İskonto aktif</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {editingId ? 'Güncelle' : 'Oluştur'}
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
