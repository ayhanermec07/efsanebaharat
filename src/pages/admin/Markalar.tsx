import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUpload } from '../../components/ImageUpload'
import { taxonomyPageRange, taxonomySearchPattern, TAXONOMY_PAGE_SIZE } from '../../lib/admin-taxonomy-query'

export default function Markalar() {
  const [markalar, setMarkalar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    marka_adi: '',
    logo_url: '',
    aktif_durum: true
  })

  useEffect(() => {
    let active = true
    async function loadMarkalar() {
      setLoading(true)
      setLoadError(false)
      try {
        const range = taxonomyPageRange(page)
        let query = supabase.from('markalar').select('*', { count: 'exact' })
        const pattern = taxonomySearchPattern(search)
        if (pattern) query = query.ilike('marka_adi', pattern)
        const { data, error, count } = await query
          .order('marka_adi', { ascending: true })
          .order('id', { ascending: true })
          .range(range.from, range.to)
        if (error) throw error
        if (!active) return
        setTotalCount(count || 0)
        if (page > 1 && count !== null && range.from >= count) {
          setPage(Math.max(1, Math.ceil(count / TAXONOMY_PAGE_SIZE)))
          return
        }
        setMarkalar(data || [])
      } catch (error) {
        console.error('Marka yükleme hatası:', error)
        if (active) { setMarkalar([]); setTotalCount(0); setLoadError(true) }
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadMarkalar()
    return () => { active = false }
  }, [page, search, refresh])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingId) {
        const { error } = await supabase
          .from('markalar')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Marka başarıyla güncellendi!')
      } else {
        const { error } = await supabase
          .from('markalar')
          .insert(formData)

        if (error) throw error
        toast.success('Marka başarıyla eklendi!')
      }

      resetForm()
      setPage(1)
      setRefresh(value => value + 1)
    } catch (error: any) {
      console.error('Marka kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu markayı silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('markalar')
        .delete()
        .eq('id', id)

      if (error) throw error

      setRefresh(value => value + 1)
      toast.success('Marka silindi!')
    } catch (error: any) {
      console.error('Marka silme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  function handleEdit(marka: any) {
    setEditingId(marka.id)
    setFormData({
      marka_adi: marka.marka_adi,
      logo_url: marka.logo_url || '',
      aktif_durum: marka.aktif_durum
    })
    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      marka_adi: '',
      logo_url: '',
      aktif_durum: true
    })
    setModalOpen(false)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Marka Yönetimi</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Marka Ekle</span>
        </button>
      </div>

      <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput) }} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <label htmlFor="marka-ara" className="sr-only">Marka adı ara</label>
        <input id="marka-ara" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={100} placeholder="Marka adı ara" className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm" />
        <div className="flex gap-2">
          <button type="submit" className="min-h-10 flex-1 rounded-lg bg-orange-600 px-4 text-sm font-medium text-white sm:flex-none">Ara</button>
          {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="min-h-10 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm sm:flex-none">Temizle</button>}
        </div>
      </form>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-red-700">Markalar yüklenemedi. <button type="button" onClick={() => setRefresh(value => value + 1)} className="min-h-10 px-3 font-semibold underline">Tekrar dene</button></div>
      ) : markalar.length === 0 ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-600">{search ? 'Aramayla eşleşen marka bulunamadı.' : 'Henüz marka bulunmuyor.'}</div>
      ) : <>
        <div className="space-y-2 sm:hidden">
          {markalar.map(marka => <div key={marka.id} className="min-w-0 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-gray-900">{marka.marka_adi}</p>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${marka.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{marka.aktif_durum ? 'Aktif' : 'Pasif'}</span>
            </div>
            {marka.logo_url && <a href={marka.logo_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center text-sm text-blue-700 underline">Logoyu aç</a>}
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-2">
              <button type="button" onClick={() => handleEdit(marka)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-blue-700"><Edit className="h-4 w-4" /> Düzenle</button>
              <button type="button" onClick={() => handleDelete(marka.id)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-red-700"><Trash2 className="h-4 w-4" /> Sil</button>
            </div>
          </div>)}
        </div>
        <div className="hidden bg-white rounded-lg shadow-sm overflow-x-auto sm:block">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marka Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {markalar.map((marka) => (
                <tr key={marka.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{marka.marka_adi}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {marka.logo_url ? (
                      <a href={marka.logo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Logo
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${marka.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {marka.aktif_durum ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button type="button"
                      onClick={() => handleEdit(marka)}
                      className="inline-flex min-h-10 items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 inline" /> Düzenle
                    </button>
                    <button type="button"
                      onClick={() => handleDelete(marka.id)}
                      className="inline-flex min-h-10 items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}

      {!loadError && totalCount > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
        <p>{totalCount} marka · Sayfa {page} / {Math.ceil(totalCount / TAXONOMY_PAGE_SIZE)}</p>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Önceki</button>
          <button type="button" disabled={loading || page * TAXONOMY_PAGE_SIZE >= totalCount} onClick={() => setPage(value => value + 1)} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Sonraki</button>
        </div>
      </div>}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[100dvh] w-full max-w-lg overflow-y-auto bg-white sm:max-h-[90vh] sm:rounded-lg">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Marka Düzenle' : 'Yeni Marka Ekle'}
                </h2>
                <button type="button" onClick={resetForm} aria-label="Marka penceresini kapat" className="inline-flex min-h-10 min-w-10 items-center justify-center text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marka Adı</label>
                  <input
                    type="text"
                    value={formData.marka_adi}
                    onChange={(e) => setFormData({ ...formData, marka_adi: e.target.value })}
                    required
                    minLength={2}
                    maxLength={100}
                    pattern="^[\p{L}0-9\s\/\&\.\-]+$"
                    title="En az 2, en fazla 100 karakter. Sadece harf, rakam, boşluk ve özel karakterler kullanabilirsiniz."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">En az 2, en fazla 100 karakter</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marka Logosu</label>
                  <ImageUpload
                    maxFiles={1}
                    bucketName="marka-logolari"
                    onUploadComplete={(urls) => setFormData({ ...formData, logo_url: urls[0] || '' })}
                    existingImages={formData.logo_url ? [formData.logo_url] : []}
                    maxSizeMB={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">Marka logosu için görsel yükleyin (Maksimum 8MB)</p>
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
