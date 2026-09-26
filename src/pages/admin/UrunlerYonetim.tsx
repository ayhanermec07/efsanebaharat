import { useCallback, useEffect, useRef, useState } from 'react'
import { publicSupabase, supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, ExternalLink, Link2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUpload } from '../../components/ImageUpload'
import AccessibleModal from '../../components/admin/AccessibleModal'
import { deactivateProduct } from '../../lib/admin-product-deactivation'
import { MANAGEMENT_PAGE_SIZE, managementPageRange, managementSearchPattern } from '../../lib/admin-management-query'

// Formdaki stok satırı. `id` yalnızca veritabanında var olan satırlarda bulunur;
// kayıt komutu bu kimliği koruyarak günceller, yeni satırlar yeni UUID alır.
type StokSatiri = {
  id?: string
  birim_adedi: number
  birim_adedi_turu?: string
  birim_turu: string
  fiyat: number
  stok_miktari: number
  stok_birimi: string
  min_siparis_miktari: number
  stok_grubu: string
  xml_export: boolean
  aktif_durum: boolean
  xml_imported?: boolean
  kaynak_stok_id?: string | null
}

function yeniStokSatiri(): StokSatiri {
  return { birim_adedi: 100, birim_adedi_turu: 'gr', birim_turu: 'gr', fiyat: 0, stok_miktari: 0, stok_birimi: 'gr', min_siparis_miktari: 1, stok_grubu: 'hepsi', xml_export: false, aktif_durum: true }
}

function kisaBirim(birim: unknown) {
  if (birim === 'gram') return 'gr'
  if (birim === 'kilogram') return 'kg'
  return typeof birim === 'string' && birim ? birim : 'gr'
}

// Edge Function hata gövdesindeki Türkçe açıklamayı okur.
async function fonksiyonHataMesaji(error: unknown, data: unknown) {
  const body = data as { error?: { message?: string } } | null
  if (body?.error?.message) return body.error.message
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    const parsed = await context.clone().json().catch(() => null)
    if (parsed?.error?.message) return String(parsed.error.message)
  }
  return error instanceof Error ? error.message : 'Bilinmeyen hata'
}

export default function UrunlerYonetim() {
  const [urunler, setUrunler] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    urun_adi: '',
    aciklama: '',
    kategori_id: '',
    marka_id: '',
    aktif_durum: true
  })
  const [stoklar, setStoklar] = useState<StokSatiri[]>([yeniStokSatiri()])
  const [urunGorselleri, setUrunGorselleri] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [formYukleniyor, setFormYukleniyor] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const listRequest = useRef(0)
  // Hızlı art arda açılan düzenlemelerde eski ürünün yanıtı forma yazılmasın.
  const duzenlemeIstegi = useRef(0)

  const loadData = useCallback(async () => {
    const currentRequest = ++listRequest.current
    setLoading(true)
    setLoadError(false)
    try {
      const range = managementPageRange(page)
      const pattern = managementSearchPattern(search)
      let productQuery = supabase.from('urunler').select('*', { count: 'exact' })
      if (pattern) productQuery = productQuery.ilike('urun_adi', pattern)
      // Manual fetching (no foreign keys - Supabase best practice)
      const [urunRes, katRes, markaRes] = await Promise.all([
        // Admin listesi oturumlu istemciyle okunur; pasif ürünler de görünür.
        productQuery.order('created_at', { ascending: false }).order('id', { ascending: false }).range(range.from, range.to),
        publicSupabase.from('kategoriler').select('*').eq('aktif_durum', true),
        publicSupabase.from('markalar').select('*').eq('aktif_durum', true)
      ])

      if (urunRes.error) throw urunRes.error
      if (katRes.error) throw katRes.error
      if (markaRes.error) throw markaRes.error
      if (currentRequest !== listRequest.current) return
      setTotalCount(urunRes.count || 0)
      if (page > 1 && urunRes.count !== null && range.from >= urunRes.count) {
        setPage(Math.max(1, Math.ceil(urunRes.count / MANAGEMENT_PAGE_SIZE)))
        return
      }

      if (urunRes.data && katRes.data && markaRes.data) {
        // Manual join - Map kategoriler ve markalar
        const urunlerWithRelations = urunRes.data.map(urun => ({
          ...urun,
          kategoriler: katRes.data.find(k => k.id === urun.kategori_id),
          markalar: markaRes.data.find(m => m.id === urun.marka_id)
        }))
        setUrunler(urunlerWithRelations)
      }

      if (katRes.data) setKategoriler(katRes.data)
      if (markaRes.data) setMarkalar(markaRes.data)
    } catch (error: any) {
      if (currentRequest !== listRequest.current) return
      console.error('Ürün yükleme hatası:', error)
      setLoadError(true)
      setUrunler([])
    } finally {
      if (currentRequest === listRequest.current) setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || formYukleniyor) return

    setSaving(true)
    try {
      // Ürün, stok diff'i ve görseller tek sunucu komutunda, tek transaction içinde
      // kaydedilir. Fiyat/stok/XML otoritesi sunucuda yeniden doğrulanır.
      const { data, error } = await supabase.functions.invoke('admin-product-save', {
        body: {
          urunId: editingId,
          urun: formData,
          stoklar: stoklar.map(s => ({
            id: s.id ?? null,
            birim_turu: s.birim_turu,
            birim_adedi: Number(s.birim_adedi),
            stok_birimi: s.stok_birimi || s.birim_turu,
            fiyat: Number(s.fiyat),
            stok_miktari: Number(s.stok_miktari),
            min_siparis_miktari: Number(s.min_siparis_miktari),
            stok_grubu: s.stok_grubu || 'hepsi',
            xml_export: Boolean(s.xml_export),
            aktif_durum: s.aktif_durum !== false
          })),
          gorseller: urunGorselleri
        }
      })
      if (error || data?.error) throw new Error(await fonksiyonHataMesaji(error, data))

      const ozet = data?.result as { deactivated?: number } | undefined
      const guncelleme = Boolean(editingId)
      resetForm()
      await loadData()
      toast.success(guncelleme ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!')
      if (ozet?.deactivated) {
        toast(`${ozet.deactivated} stok seçeneği geçmiş kayıtlarda kullanıldığı için silinmedi, pasifleştirildi.`)
      }
    } catch (error: unknown) {
      console.error('Ürün kayıt hatası:', error)
      toast.error('Kaydedilmedi: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(urun: { id: string; urun_adi: string }) {
    if (saving || !confirm(`${urun.urun_adi} ürününü satıştan kaldırıp pasifleştirmek istiyor musunuz?`)) return
    setSaving(true)
    try {
      await deactivateProduct(supabase, urun.id)
      await loadData()
      toast.success('Ürün pasifleştirildi; stok, görsel ve sipariş geçmişi korundu.')
    } catch (error: unknown) {
      toast.error('Ürün pasifleştirilemedi: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(urun: any) {
    const istek = ++duzenlemeIstegi.current
    setEditingId(urun.id)
    setFormData({
      urun_adi: urun.urun_adi,
      aciklama: urun.aciklama || '',
      kategori_id: urun.kategori_id || '',
      marka_id: urun.marka_id || '',
      aktif_durum: urun.aktif_durum !== false
    })
    // Önceki üründen stok/görsel durumu taşınmasın.
    setStoklar([])
    setUrunGorselleri([])
    setFormYukleniyor(true)
    setModalOpen(true)

    Promise.all([
      supabase.from('urun_stoklari')
        .select('id, urun_id, birim_turu, birim_adedi, birim_adedi_turu, fiyat, stok_miktari, stok_birimi, min_siparis_miktari, stok_grubu, aktif_durum, xml_export, xml_imported, kaynak_stok_id')
        .eq('urun_id', urun.id)
        .order('created_at', { ascending: true }),
      supabase.from('urun_gorselleri').select('gorsel_url, sira_no').eq('urun_id', urun.id).order('sira_no', { ascending: true })
    ]).then(([stokRes, gorselRes]) => {
      if (istek !== duzenlemeIstegi.current) return
      if (stokRes.error || gorselRes.error) {
        toast.error('Ürün detayları yüklenemedi: ' + (stokRes.error || gorselRes.error)?.message)
        resetForm()
        return
      }
      const data = stokRes.data || []
      setStoklar(data.length > 0 ? data.map(s => {
        const birimTuru = kisaBirim(s.birim_turu)
        // Stok birimi yoksa birim türüne göre belirle
        const stokBirimi = s.stok_birimi ? kisaBirim(s.stok_birimi) : (birimTuru === 'adet' ? 'adet' : birimTuru === 'kg' ? 'kg' : 'gr')
        return {
          id: s.id,
          birim_adedi: Number(s.birim_adedi) || 100,
          birim_adedi_turu: s.birim_adedi_turu || s.birim_turu,
          birim_turu: birimTuru,
          fiyat: Number(s.fiyat) || 0,
          stok_miktari: Number(s.stok_miktari) || 0,
          stok_birimi: stokBirimi,
          min_siparis_miktari: Number(s.min_siparis_miktari) || 1,
          stok_grubu: s.stok_grubu || 'hepsi',
          xml_export: s.xml_export || false,
          aktif_durum: s.aktif_durum !== false,
          xml_imported: s.xml_imported === true,
          kaynak_stok_id: s.kaynak_stok_id ?? null
        }
      }) : [yeniStokSatiri()])
      setUrunGorselleri((gorselRes.data || []).map(g => g.gorsel_url))
      setFormYukleniyor(false)
    })
  }

  const resetForm = useCallback(() => {
    duzenlemeIstegi.current++
    setEditingId(null)
    setFormData({
      urun_adi: '',
      aciklama: '',
      kategori_id: '',
      marka_id: '',
      aktif_durum: true
    })
    setStoklar([yeniStokSatiri()])
    setUrunGorselleri([])
    setFormYukleniyor(false)
    setModalOpen(false)
  }, [])

  function addStok() {
    setStoklar([...stoklar, yeniStokSatiri()])
  }

  function removeStok(index: number) {
    setStoklar(stoklar.filter((_, i) => i !== index))
  }

  function updateStok(index: number, field: keyof StokSatiri, value: unknown) {
    const newStoklar = [...stoklar]
    // NaN kontrolü - eğer value NaN ise 0 kullan
    const safeValue = (typeof value === 'number' && isNaN(value)) ? 0 : value
    newStoklar[index] = { ...newStoklar[index], [field]: safeValue }
    setStoklar(newStoklar)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Ürün Yönetimi</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Ürün Ekle</span>
        </button>
      </div>

      <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput) }} className="mb-4 flex min-w-0 flex-wrap gap-2">
        <label htmlFor="urun-ara" className="sr-only">Ürün adına göre ara</label>
        <input id="urun-ara" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={100} placeholder="Ürün adına göre ara" className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-3" />
        <button type="submit" className="min-h-10 rounded-lg bg-orange-600 px-4 text-white">Ara</button>
        {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="min-h-10 px-3 text-orange-700">Temizle</button>}
      </form>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-lg bg-white p-6 text-center text-red-700">Ürünler yüklenemedi. <button type="button" onClick={() => void loadData()} className="min-h-10 px-2 underline">Tekrar dene</button></div>
      ) : urunler.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-600">{search ? 'Aramayla eşleşen ürün bulunmuyor' : 'Henüz ürün bulunmuyor'}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marka</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {urunler.map((urun) => (
                <tr key={urun.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{urun.urun_adi}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{urun.kategoriler?.kategori_adi}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{urun.markalar?.marka_adi}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${urun.aktif_durum ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {urun.aktif_durum ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(urun)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 inline" /> Düzenle
                    </button>
                    {urun.aktif_durum && <button
                      type="button"
                      onClick={() => handleDeactivate(urun)}
                      disabled={saving}
                      className="min-h-10 text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Pasifleştir
                    </button>}
                    <button
                      onClick={() => window.open(`/urun/${urun.id}`, '_blank')}
                      className="text-green-600 hover:text-green-700"
                      title="Ürünü önizle"
                    >
                      <ExternalLink className="w-4 h-4 inline" /> Ön İzleme
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadError && totalCount > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
        <span>{totalCount} ürün · Sayfa {page} / {Math.ceil(totalCount / MANAGEMENT_PAGE_SIZE)}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-50">Önceki</button>
          <button type="button" disabled={loading || page * MANAGEMENT_PAGE_SIZE >= totalCount} onClick={() => setPage(value => value + 1)} className="min-h-10 rounded-lg border px-3 disabled:opacity-50">Sonraki</button>
        </div>
      </div>}

      {/* Modal */}
      <AccessibleModal open={modalOpen} onClose={resetForm} title={editingId ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'} className="max-w-2xl">

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ürün Adı</label>
                  <input
                    type="text"
                    value={formData.urun_adi}
                    onChange={(e) => setFormData({ ...formData, urun_adi: e.target.value })}
                    required
                    minLength={3}
                    maxLength={200}
                    title="En az 3, en fazla 200 karakter"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">En az 3, en fazla 200 karakter</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <textarea
                    value={formData.aciklama}
                    onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                    <select
                      value={formData.kategori_id}
                      onChange={(e) => setFormData({ ...formData, kategori_id: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seçiniz</option>
                      {kategoriler.map(k => (
                        <option key={k.id} value={k.id}>{k.kategori_adi}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marka</label>
                    <select
                      value={formData.marka_id}
                      onChange={(e) => setFormData({ ...formData, marka_id: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seçiniz</option>
                      {markalar.map(m => (
                        <option key={m.id} value={m.id}>{m.marka_adi}</option>
                      ))}
                    </select>
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

                {/* Ürün Görselleri */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Ürün Görselleri (Maksimum 10)</h3>
                  <ImageUpload
                    maxFiles={10}
                    bucketName="urun-gorselleri"
                    onUploadComplete={(urls) => setUrunGorselleri(urls)}
                    existingImages={urunGorselleri}
                    maxSizeMB={8}
                  />
                  <p className="text-xs text-gray-500 mt-2">İlk görsel ürün kartlarında ana görsel olarak gösterilecektir.</p>
                </div>

                {/* Stok Bilgileri */}
                <div className="border-t pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">Stok Seçenekleri</h3>
                    <button
                      type="button"
                      onClick={addStok}
                      disabled={formYukleniyor}
                      className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
                    >
                      + Stok Ekle
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4 break-words">
                    Mevcut seçenekler aynı kimlikle güncellenir. Sipariş veya stok geçmişi olan seçenek silinmez, pasifleştirilir.
                    XML ile gelen satırlarda miktar, fiyat ve birim muhasebe XML&apos;inden yönetilir.
                  </p>

                  {formYukleniyor && (
                    <div className="py-6 text-center text-sm text-gray-500" role="status">Stok seçenekleri yükleniyor…</div>
                  )}

                  {/* Başlıklar - Desktop */}
                  <div className="hidden lg:grid grid-cols-9 gap-2 mb-3">
                    <div className="text-sm font-medium text-gray-700 col-span-2">Birim Adedi</div>
                    <div className="text-sm font-medium text-gray-700">Fiyat (TL)</div>
                    <div className="text-sm font-medium text-gray-700 col-span-2">Stok</div>
                    <div className="text-sm font-medium text-gray-700">Min. Sipariş</div>
                    <div className="text-sm font-medium text-gray-700">Müşteri Grubu</div>
                    <div className="text-sm font-medium text-gray-700 text-center">XML / Aktif</div>
                    <div></div>
                  </div>

                  {stoklar.map((stok, index) => {
                    // Birim türüne göre stok birimi seçeneklerini belirle
                    let stokBirimiSecenekleri
                    if (stok.birim_turu === 'adet') {
                      stokBirimiSecenekleri = [{ value: 'adet', label: 'Adet' }]
                    } else if (stok.birim_turu === 'gr') {
                      stokBirimiSecenekleri = [
                        { value: 'gr', label: 'GR' },
                        { value: 'kg', label: 'KG' }
                      ]
                    } else if (stok.birim_turu === 'kg') {
                      stokBirimiSecenekleri = [{ value: 'kg', label: 'KG' }]
                    } else {
                      stokBirimiSecenekleri = [{ value: 'gr', label: 'GR' }]
                    }
                    // XML ana stok otoritesi importer'dadır; bu alanlar formdan değiştirilemez.
                    const xmlKilitli = stok.xml_imported === true
                    const gramKaynaklar = stoklar.filter(s => s.birim_turu === 'gr' && s.aktif_durum !== false
                      && (s.stok_grubu === stok.stok_grubu || s.stok_grubu === 'hepsi'))
                    const gramKaynak = stok.kaynak_stok_id
                      ? stoklar.find(s => s.id === stok.kaynak_stok_id)
                      : gramKaynaklar.length === 1 ? gramKaynaklar[0] : null
                    const turetilmisKgFiyat = stok.birim_turu === 'kg' && gramKaynak
                      ? Number(gramKaynak.fiyat) * 1000 * Number(stok.birim_adedi)
                      : null
                    const satirNo = index + 1

                    return (
                      <div key={stok.id ?? `yeni-${index}`} className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 mb-4 lg:mb-2 p-3 lg:p-0 bg-gray-50 lg:bg-transparent rounded-lg lg:rounded-none ${stok.aktif_durum === false ? 'opacity-70' : ''}`}>
                        {(xmlKilitli || stok.birim_turu === 'kg' || stok.aktif_durum === false) && (
                          <div className="col-span-2 sm:col-span-4 lg:col-span-9 flex flex-wrap gap-2 text-xs">
                            {xmlKilitli && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                                <Lock className="h-3 w-3" aria-hidden="true" /> XML ana stok
                              </span>
                            )}
                            {stok.birim_turu === 'kg' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-800">
                                <Link2 className="h-3 w-3" aria-hidden="true" /> Gram ana stoktan düşer; fiyat gramdan türetilir
                              </span>
                            )}
                            {stok.aktif_durum === false && (
                              <span className="rounded-full bg-gray-200 px-2 py-1 text-gray-700">Pasif</span>
                            )}
                          </div>
                        )}
                        <input
                          type="number"
                          placeholder="100"
                          aria-label={`${satirNo}. seçenek birim adedi`}
                          value={stok.birim_adedi || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            updateStok(index, 'birim_adedi', isNaN(val) ? 0 : val)
                          }}
                          required
                          disabled={xmlKilitli}
                          step="0.01"
                          min="0"
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                        />
                        <select
                          value={stok.birim_turu || 'gr'}
                          aria-label={`${satirNo}. seçenek birim türü`}
                          onChange={(e) => {
                            const yeniBirim = e.target.value
                            const newStoklar = [...stoklar]
                            newStoklar[index] = { ...newStoklar[index], birim_turu: yeniBirim }

                            // Birim türü değiştiğinde stok birimini otomatik ayarla
                            if (yeniBirim === 'adet') {
                              newStoklar[index].stok_birimi = 'adet'
                            } else if (yeniBirim === 'kg') {
                              newStoklar[index].stok_birimi = 'kg'
                              newStoklar[index].birim_adedi = 1
                            } else if (yeniBirim === 'gr') {
                              // GR seçildiğinde, eğer stok birimi adet ise gr yap
                              if (newStoklar[index].stok_birimi === 'adet') {
                                newStoklar[index].stok_birimi = 'gr'
                              }
                              // Aksi halde mevcut değeri koru (gr veya kg)
                            }

                            setStoklar(newStoklar)
                          }}
                          required
                          disabled={xmlKilitli}
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                        >
                          <option value="adet">Adet</option>
                          <option value="gr">GR</option>
                          <option value="kg">KG</option>
                        </select>
                        <input
                          type="number"
                          placeholder="0.00"
                          aria-label={`${satirNo}. seçenek fiyatı (TL)`}
                          value={turetilmisKgFiyat ?? (stok.fiyat || '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            updateStok(index, 'fiyat', isNaN(val) ? 0 : val)
                          }}
                          required
                          disabled={xmlKilitli || stok.birim_turu === 'kg'}
                          step="0.01"
                          min="0"
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                        />
                        <input
                          type="number"
                          placeholder="Miktar"
                          aria-label={`${satirNo}. seçenek stok miktarı`}
                          value={stok.stok_miktari || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            const yeniMiktar = isNaN(val) ? 0 : val
                            // Birim adedi ve stok birimi aynı ise minimum kontrolü
                            if (stok.birim_turu === stok.stok_birimi) {
                              if (yeniMiktar < (stok.birim_adedi || 0)) {
                                toast.error(`Stok miktarı ${stok.birim_adedi} ${stok.birim_turu?.toUpperCase()}'den küçük olamaz!`)
                                return
                              }
                            }
                            updateStok(index, 'stok_miktari', yeniMiktar)
                          }}
                          required
                          disabled={xmlKilitli}
                          step="0.001"
                          min={xmlKilitli ? 0 : stok.birim_turu === stok.stok_birimi ? (stok.birim_adedi || 0) : 0}
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                        />
                        <select
                          value={stok.stok_birimi || stok.birim_turu || 'gr'}
                          aria-label={`${satirNo}. seçenek stok birimi`}
                          onChange={(e) => updateStok(index, 'stok_birimi', e.target.value)}
                          required
                          disabled={xmlKilitli}
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm disabled:bg-gray-100"
                        >
                          {stokBirimiSecenekleri.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Min"
                          aria-label={`${satirNo}. seçenek minimum sipariş`}
                          value={stok.min_siparis_miktari || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 1 : parseFloat(e.target.value)
                            updateStok(index, 'min_siparis_miktari', isNaN(val) ? 1 : val)
                          }}
                          required
                          min="1"
                          step="1"
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={stok.stok_grubu || 'hepsi'}
                          aria-label={`${satirNo}. seçenek müşteri grubu`}
                          onChange={(e) => updateStok(index, 'stok_grubu', e.target.value)}
                          required
                          className="min-w-0 min-h-10 px-2 py-1 border rounded text-sm"
                        >
                          <option value="hepsi">Hepsi</option>
                          <option value="musteri">Müşteri</option>
                          <option value="bayi">Bayi</option>
                        </select>
                        <div className="flex min-h-10 items-center justify-start gap-3 lg:justify-center">
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stok.xml_export || false}
                              onChange={(e) => updateStok(index, 'xml_export', e.target.checked)}
                              className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                            />
                            XML
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stok.aktif_durum !== false}
                              onChange={(e) => updateStok(index, 'aktif_durum', e.target.checked)}
                              className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                            />
                            Aktif
                          </label>
                        </div>
                        {stoklar.length > 1 && !xmlKilitli && (
                          <button
                            type="button"
                            onClick={() => removeStok(index)}
                            className="grid h-10 w-10 place-items-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label={`${satirNo}. stok seçeneğini kaldır`}
                            title={stok.id ? 'Kaldır (geçmişi varsa pasifleştirilir)' : 'Kaldır'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving || formYukleniyor}
                    className="min-h-11 flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Kaydediliyor…' : editingId ? 'Güncelle' : 'Kaydet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="min-h-11 flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    İptal
                  </button>
                </div>
              </form>
      </AccessibleModal>
    </div>
  )
}
