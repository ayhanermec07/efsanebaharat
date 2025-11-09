import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Store, Plus, Edit, Trash2, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Bayi {
  id: string
  bayii_kodu: string
  bayi_adi: string
  yetkili_kisi: string
  email: string
  telefon: string | null
  adres: string | null
  aktif: boolean
  olusturma_tarihi: string
}

interface BayiFormData {
  bayii_kodu: string
  bayi_adi: string
  yetkili_kisi: string
  email: string
  telefon: string
  adres: string
  aktif: boolean
}

export default function AdminBayiler() {
  const [bayiler, setBayiler] = useState<Bayi[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selectedBayi, setSelectedBayi] = useState<Bayi | null>(null)
  const [formData, setFormData] = useState<BayiFormData>({
    bayii_kodu: '',
    bayi_adi: '',
    yetkili_kisi: '',
    email: '',
    telefon: '',
    adres: '',
    aktif: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBayiler()
  }, [])

  async function loadBayiler() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bayiler')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })

      if (error) throw error

      setBayiler(data || [])
    } catch (error: any) {
      console.error('Bayiler yükleme hatası:', error)
      toast.error('Bayiler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function generateBayiiKodu() {
    const prefix = 'BAY'
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    return `${prefix}${randomNum}`
  }

  function openCreateModal() {
    setFormData({
      bayii_kodu: generateBayiiKodu(),
      bayi_adi: '',
      yetkili_kisi: '',
      email: '',
      telefon: '',
      adres: '',
      aktif: true
    })
    setSelectedBayi(null)
    setModal('create')
  }

  function openEditModal(bayi: Bayi) {
    setFormData({
      bayii_kodu: bayi.bayii_kodu,
      bayi_adi: bayi.bayi_adi,
      yetkili_kisi: bayi.yetkili_kisi,
      email: bayi.email,
      telefon: bayi.telefon || '',
      adres: bayi.adres || '',
      aktif: bayi.aktif
    })
    setSelectedBayi(bayi)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setSelectedBayi(null)
    setFormData({
      bayii_kodu: '',
      bayi_adi: '',
      yetkili_kisi: '',
      email: '',
      telefon: '',
      adres: '',
      aktif: true
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.bayii_kodu || formData.bayii_kodu.length < 5) {
      toast.error('Bayii kodu en az 5 karakter olmalıdır')
      return
    }

    if (!formData.bayi_adi || formData.bayi_adi.length < 3) {
      toast.error('Bayi adı en az 3 karakter olmalıdır')
      return
    }

    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Geçerli bir email adresi giriniz')
      return
    }

    setSaving(true)

    try {
      if (modal === 'create') {
        // Yeni bayi oluştur
        const { error } = await supabase
          .from('bayiler')
          .insert([{
            bayii_kodu: formData.bayii_kodu.toUpperCase(),
            bayi_adi: formData.bayi_adi,
            yetkili_kisi: formData.yetkili_kisi,
            email: formData.email.toLowerCase(),
            telefon: formData.telefon || null,
            adres: formData.adres || null,
            aktif: formData.aktif
          }])

        if (error) throw error

        // Bayi kullanıcısı oluştur
        try {
          const password = formData.bayii_kodu.toUpperCase() + '2024!'
          const { data: { session } } = await supabase.auth.getSession()
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bayi-kullanici-olustur`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                email: formData.email.toLowerCase(),
                password: password
              })
            }
          )

          const result = await response.json()
          
          if (!response.ok) {
            console.error('Kullanıcı oluşturma hatası:', result)
            toast('Bayi oluşturuldu ancak kullanıcı hesabı oluşturulamadı', { icon: '⚠️' })
          }
        } catch (edgeFuncError: any) {
          console.error('Edge function hatası:', edgeFuncError)
          toast('Bayi oluşturuldu ancak kullanıcı hesabı oluşturulamadı', { icon: '⚠️' })
        }

        toast.success('Bayi başarıyla oluşturuldu')
      } else if (modal === 'edit' && selectedBayi) {
        // Bayi güncelle
        const { error } = await supabase
          .from('bayiler')
          .update({
            bayi_adi: formData.bayi_adi,
            yetkili_kisi: formData.yetkili_kisi,
            email: formData.email.toLowerCase(),
            telefon: formData.telefon || null,
            adres: formData.adres || null,
            aktif: formData.aktif,
            guncelleme_tarihi: new Date().toISOString()
          })
          .eq('id', selectedBayi.id)

        if (error) throw error

        toast.success('Bayi başarıyla güncellendi')
      }

      closeModal()
      loadBayiler()
    } catch (error: any) {
      console.error('Bayi kaydetme hatası:', error)
      if (error.code === '23505') {
        if (error.message.includes('bayii_kodu')) {
          toast.error('Bu bayii kodu zaten kullanılıyor')
        } else if (error.message.includes('email')) {
          toast.error('Bu email adresi zaten kullanılıyor')
        }
      } else {
        toast.error(error.message || 'Bayi kaydedilemedi')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(bayi: Bayi) {
    if (!confirm(`${bayi.bayi_adi} bayisini silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('bayiler')
        .delete()
        .eq('id', bayi.id)

      if (error) throw error

      toast.success('Bayi başarıyla silindi')
      loadBayiler()
    } catch (error: any) {
      console.error('Bayi silme hatası:', error)
      toast.error(error.message || 'Bayi silinemedi')
    }
  }

  async function toggleAktif(bayi: Bayi) {
    try {
      const { error } = await supabase
        .from('bayiler')
        .update({
          aktif: !bayi.aktif,
          guncelleme_tarihi: new Date().toISOString()
        })
        .eq('id', bayi.id)

      if (error) throw error

      toast.success(`Bayi ${!bayi.aktif ? 'aktif' : 'pasif'} hale getirildi`)
      loadBayiler()
    } catch (error: any) {
      console.error('Durum güncelleme hatası:', error)
      toast.error(error.message || 'Durum güncellenemedi')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Store className="w-8 h-8 text-orange-600" />
            Bayi Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">
            Bayileri yönetin, yeni bayi ekleyin ve satış raporlarını takip edin
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yeni Bayi Ekle
        </button>
      </div>

      {bayiler.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Henüz bayi bulunmuyor</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            İlk Bayiyi Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bayii Kodu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bayi Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yetkili Kişi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bayiler.map((bayi) => (
                <tr key={bayi.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-semibold text-gray-900">
                      {bayi.bayii_kodu}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{bayi.bayi_adi}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {bayi.yetkili_kisi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {bayi.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {bayi.telefon || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleAktif(bayi)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        bayi.aktif
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {bayi.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(bayi)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Düzenle"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(bayi)}
                      className="text-red-600 hover:text-red-900"
                      title="Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bayi Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {modal === 'create' ? 'Yeni Bayi Ekle' : 'Bayi Düzenle'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bayii Kodu *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.bayii_kodu}
                    onChange={(e) => setFormData({ ...formData, bayii_kodu: e.target.value.toUpperCase() })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                    placeholder="BAY123456"
                    required
                    minLength={5}
                    disabled={modal === 'edit'}
                  />
                  {modal === 'create' && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bayii_kodu: generateBayiiKodu() })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                      title="Yeni kod oluştur"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {modal === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1">Bayii kodu değiştirilemez</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bayi Adı *
                </label>
                <input
                  type="text"
                  value={formData.bayi_adi}
                  onChange={(e) => setFormData({ ...formData, bayi_adi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="ABC Gıda Ltd. Şti."
                  required
                  minLength={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yetkili Kişi *
                </label>
                <input
                  type="text"
                  value={formData.yetkili_kisi}
                  onChange={(e) => setFormData({ ...formData, yetkili_kisi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="info@abcgida.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0 (555) 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres
                </label>
                <textarea
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="İş adresi"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="aktif"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="aktif" className="text-sm font-medium text-gray-700">
                  Bayi aktif
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    modal === 'create' ? 'Bayi Oluştur' : 'Güncelle'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
