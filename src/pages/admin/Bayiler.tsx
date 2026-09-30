import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MANAGEMENT_PAGE_SIZE, managementPageRange, managementSearchPattern } from '../../lib/admin-management-query'
import { Store, Plus, Edit, Trash2, X, RefreshCw, Mail } from 'lucide-react'
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
  kullanici_id: string | null
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
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const requestId = useRef(0)

  const loadBayiler = useCallback(async () => {
    const currentRequest = ++requestId.current
    try {
      setLoading(true)
      setLoadError(false)
      let query = supabase
        .from('bayiler')
        .select('*', { count: 'exact' })
      const pattern = managementSearchPattern(search)
      const range = managementPageRange(page)
      if (pattern) query = query.ilike('bayi_adi', pattern)
      const { data, error, count } = await query
        .order('olusturma_tarihi', { ascending: false })
        .order('id', { ascending: false })
        .range(range.from, range.to)

      if (error) throw error
      if (currentRequest !== requestId.current) return
      setTotalCount(count || 0)
      if (page > 1 && count !== null && range.from >= count) {
        setPage(Math.max(1, Math.ceil(count / MANAGEMENT_PAGE_SIZE)))
        return
      }
      setBayiler(data || [])
    } catch (error: any) {
      if (currentRequest !== requestId.current) return
      console.error('Bayiler yükleme hatası:', error)
      setLoadError(true)
      setBayiler([])
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void loadBayiler()
  }, [loadBayiler])

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

        const { data: functionData, error: functionError } = await supabase.functions.invoke('bayi-kullanici-olustur', {
          body: {
            email: formData.email.toLowerCase(),
            bayii_kodu: formData.bayii_kodu.toUpperCase(),
            bayi_adi: formData.bayi_adi
          }
        })

        if (functionError || functionData?.error) {
          toast.error('Bayi kaydı oluştu ancak davet gönderilemedi. E-posta ayarlarını kontrol edip listedeki Davet et düğmesiyle tekrar deneyin.')
          closeModal()
          void loadBayiler()
          return
        }

        toast.success('Bayi oluşturuldu ve şifre belirleme daveti e-posta ile gönderildi.')
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

  async function sendInvite(bayi: Bayi) {
    if (invitingId) return
    setInvitingId(bayi.id)
    try {
      const { data, error } = await supabase.functions.invoke('bayi-kullanici-olustur', {
        body: { bayii_kodu: bayi.bayii_kodu, email: bayi.email },
      })
      if (error || data?.error) throw error || new Error(data.error.message || 'Davet gönderilemedi')
      toast.success('Bayi erişim bağlantısı e-posta ile gönderildi.')
      void loadBayiler()
    } catch (error) {
      console.error('Bayi davet hatası:', error)
      toast.error('Davet gönderilemedi. E-posta ayarlarını ve bayi kaydını kontrol edip tekrar deneyin.')
    } finally {
      setInvitingId(null)
    }
  }

  async function handleDelete(bayi: Bayi) {
    if (bayi.kullanici_id) {
      toast.error('Bağlı bayi hesabını silmek yerine pasifleştirin; sipariş geçmişi korunmalıdır.')
      return
    }
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

  return (
    <div className="min-w-0 p-4 sm:p-8">
      <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
            Bayi Yönetimi
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Bayileri yönetin, yeni bayi ekleyin ve satış raporlarını takip edin
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-emerald-800 transition flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Yeni Bayi Ekle
        </button>
      </div>

      <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput) }} className="mb-4 flex min-w-0 flex-wrap gap-2">
        <label htmlFor="bayi-ara" className="sr-only">Bayi adına göre ara</label>
        <input id="bayi-ara" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={100} placeholder="Bayi adına göre ara" className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-3" />
        <button type="submit" className="min-h-10 rounded-lg bg-brand px-4 text-white">Ara</button>
        {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="min-h-10 px-3 text-orange-700">Temizle</button>}
      </form>

      {loading ? (
        <div role="status" className="py-12 text-center">Bayiler yükleniyor…</div>
      ) : loadError ? (
        <div className="rounded-lg bg-white p-6 text-center text-red-700">Bayiler yüklenemedi. <button type="button" onClick={() => void loadBayiler()} className="min-h-10 px-2 underline">Tekrar dene</button></div>
      ) : bayiler.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{search ? 'Aramayla eşleşen bayi bulunmuyor' : 'Henüz bayi bulunmuyor'}</p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-6 py-2 bg-brand text-white rounded-lg hover:bg-emerald-800"
          >
            İlk Bayiyi Ekle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto" role="region" tabIndex={0} aria-label="Bayi listesi, yatay kaydırılabilir">
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
                      type="button"
                      onClick={() => toggleAktif(bayi)}
                      className={`min-h-10 px-3 py-1 text-xs font-semibold rounded-full ${bayi.aktif
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                    >
                      {bayi.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      disabled={invitingId !== null}
                      onClick={() => void sendInvite(bayi)}
                      className="mr-2 inline-flex min-h-10 items-center gap-1 rounded px-2 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                      title={bayi.kullanici_id ? 'Erişim bağlantısını tekrar gönder' : 'Bayi daveti gönder'}
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      <span>{invitingId === bayi.id ? 'Gönderiliyor…' : bayi.kullanici_id ? 'Yeniden davet' : 'Davet et'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(bayi)}
                      className="mr-2 inline-flex min-h-10 min-w-10 items-center justify-center rounded text-blue-600 hover:bg-blue-50 hover:text-blue-900"
                      title="Düzenle"
                      aria-label={`${bayi.bayi_adi} bayisini düzenle`}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bayi)}
                      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-red-600 hover:bg-red-50 hover:text-red-900"
                      title="Sil"
                      aria-label={`${bayi.bayi_adi} bayisini sil`}
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

      {!loadError && totalCount > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
        <span>{totalCount} bayi · Sayfa {page} / {Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE)}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-50">Önceki</button>
          <button type="button" disabled={loading || page * MANAGEMENT_PAGE_SIZE >= totalCount} onClick={() => setPage(value => value + 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-50">Sonraki</button>
        </div>
      </div>}

      {/* Bayi Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-lg shadow-xl w-full max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto">
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent font-mono"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
                  placeholder="info@abcgida.com"
                  required
                  disabled={modal === 'edit' && Boolean(selectedBayi?.kullanici_id)}
                />
                {modal === 'edit' && selectedBayi?.kullanici_id && <p className="mt-1 text-xs text-gray-600">Bağlı hesabın e-postası bu ekrandan değiştirilemez.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
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
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-emerald-700"
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
                  className="flex-1 px-4 py-2 bg-brand text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
