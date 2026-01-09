import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit, Trash2, Save, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { ImageUpload } from '../../components/ImageUpload'

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
  const [stoklar, setStoklar] = useState<any[]>([
    { birim_adedi: 100, birim_adedi_turu: 'gr', birim_turu: 'gr', fiyat: 0, stok_miktari: 0, stok_birimi: 'gr', min_siparis_miktari: 1, stok_grubu: 'hepsi', xml_export: false }
  ])
  const [urunGorselleri, setUrunGorselleri] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Manual fetching (no foreign keys - Supabase best practice)
    const [urunRes, katRes, markaRes] = await Promise.all([
      supabase.from('urunler').select('*').order('created_at', { ascending: false }),
      supabase.from('kategoriler').select('*').eq('aktif_durum', true),
      supabase.from('markalar').select('*').eq('aktif_durum', true)
    ])

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
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingId) {
        // Güncelleme
        const { error: urunError } = await supabase.from('urunler').update(formData).eq('id', editingId)
        if (urunError) throw urunError

        // Stokları güncelle - önce sil, sonra ekle
        await supabase.from('urun_stoklari').delete().eq('urun_id', editingId)
        const stokData = stoklar.map(s => ({ ...s, urun_id: editingId, aktif_durum: true }))
        const { error: stokError } = await supabase.from('urun_stoklari').insert(stokData)
        if (stokError) throw stokError

        // Görselleri güncelle - önce sil, sonra ekle
        await supabase.from('urun_gorselleri').delete().eq('urun_id', editingId)
        if (urunGorselleri.length > 0) {
          const gorselData = urunGorselleri.map((url, index) => ({
            urun_id: editingId,
            gorsel_url: url,
            sira_no: index
          }))
          const { error: gorselError } = await supabase.from('urun_gorselleri').insert(gorselData)
          if (gorselError) throw gorselError
        }
      } else {
        // Yeni ürün
        const { data: newUrun, error: urunError } = await supabase
          .from('urunler')
          .insert(formData)
          .select()
          .maybeSingle()

        if (urunError) throw urunError

        if (newUrun) {
          const stokData = stoklar.map(s => ({ ...s, urun_id: newUrun.id, aktif_durum: true }))
          const { error: stokError } = await supabase.from('urun_stoklari').insert(stokData)
          if (stokError) throw stokError

          // Görselleri ekle
          if (urunGorselleri.length > 0) {
            const gorselData = urunGorselleri.map((url, index) => ({
              urun_id: newUrun.id,
              gorsel_url: url,
              sira_no: index
            }))
            const { error: gorselError } = await supabase.from('urun_gorselleri').insert(gorselData)
            if (gorselError) throw gorselError
          }
        }
      }

      resetForm()
      await loadData()
      toast.success(editingId ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!')
    } catch (error: any) {
      console.error('Ürün kayıt hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      await supabase.from('urun_stoklari').delete().eq('urun_id', id)
      await supabase.from('urun_gorselleri').delete().eq('urun_id', id)
      await supabase.from('urunler').delete().eq('id', id)
      loadData()
      toast.success('Ürün silindi!')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  function handleEdit(urun: any) {
    setEditingId(urun.id)
    setFormData({
      urun_adi: urun.urun_adi,
      aciklama: urun.aciklama || '',
      kategori_id: urun.kategori_id,
      marka_id: urun.marka_id,
      aktif_durum: urun.aktif_durum
    })

    // Stokları yükle
    supabase.from('urun_stoklari')
      .select('id, urun_id, birim_turu, birim_adedi, birim_adedi_turu, fiyat, stok_miktari, stok_birimi, min_siparis_miktari, stok_grubu, aktif_durum, xml_export')
      .eq('urun_id', urun.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setStoklar(data.map(s => {
            // Stok birimi yoksa birim türüne göre belirle
            let stokBirimi = s.stok_birimi
            if (!stokBirimi) {
              if (s.birim_turu === 'adet') {
                stokBirimi = 'adet'
              } else if (s.birim_turu === 'kg') {
                stokBirimi = 'kg'
              } else {
                stokBirimi = 'gr'
              }
            }

            return {
              birim_adedi: Number(s.birim_adedi) || 100,
              birim_adedi_turu: s.birim_adedi_turu || s.birim_turu,
              birim_turu: s.birim_turu,
              fiyat: Number(s.fiyat) || 0,
              stok_miktari: Number(s.stok_miktari) || 0,
              stok_birimi: stokBirimi,
              min_siparis_miktari: Number(s.min_siparis_miktari) || 1,
              stok_grubu: s.stok_grubu || 'hepsi',
              xml_export: s.xml_export || false
            }
          }))
        } else {
          // Stok yoksa default ekle
          setStoklar([{
            birim_adedi: 100,
            birim_adedi_turu: 'gr',
            birim_turu: 'gr',
            fiyat: 0,
            stok_miktari: 0,
            stok_birimi: 'gr',
            min_siparis_miktari: 1,
            stok_grubu: 'hepsi',
            xml_export: false
          }])
        }
      })

    // Görselleri yükle
    supabase.from('urun_gorselleri').select('*').eq('urun_id', urun.id).order('sira_no', { ascending: true }).then(({ data }) => {
      if (data && data.length > 0) {
        setUrunGorselleri(data.map(g => g.gorsel_url))
      }
    })

    setModalOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      urun_adi: '',
      aciklama: '',
      kategori_id: '',
      marka_id: '',
      aktif_durum: true
    })
    setStoklar([{ birim_adedi: 100, birim_adedi_turu: 'gr', birim_turu: 'gr', fiyat: 0, stok_miktari: 0, stok_birimi: 'gr', min_siparis_miktari: 1, stok_grubu: 'hepsi', xml_export: false }])
    setUrunGorselleri([])
    setModalOpen(false)
  }

  function addStok() {
    setStoklar([...stoklar, { birim_adedi: 100, birim_adedi_turu: 'gr', birim_turu: 'gr', fiyat: 0, stok_miktari: 0, stok_birimi: 'gr', min_siparis_miktari: 1, stok_grubu: 'hepsi', xml_export: false }])
  }

  function removeStok(index: number) {
    setStoklar(stoklar.filter((_, i) => i !== index))
  }

  function updateStok(index: number, field: string, value: any) {
    const newStoklar = [...stoklar]
    // NaN kontrolü - eğer value NaN ise 0 kullan
    const safeValue = (typeof value === 'number' && isNaN(value)) ? 0 : value
    newStoklar[index] = { ...newStoklar[index], [field]: safeValue }
    setStoklar(newStoklar)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ürün Yönetimi</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Ürün Ekle</span>
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
                    <button
                      onClick={() => handleDelete(urun.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" /> Sil
                    </button>
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

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

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Stok Seçenekleri</h3>
                    <button
                      type="button"
                      onClick={addStok}
                      className="text-orange-600 hover:text-orange-700 text-sm"
                    >
                      + Stok Ekle
                    </button>
                  </div>

                  {/* Başlıklar */}
                  <div className="grid grid-cols-9 gap-2 mb-3">
                    <div className="text-sm font-medium text-gray-700 col-span-2">Birim Adedi</div>
                    <div className="text-sm font-medium text-gray-700">Fiyat (TL)</div>
                    <div className="text-sm font-medium text-gray-700 col-span-2">Stok</div>
                    <div className="text-sm font-medium text-gray-700">Min. Sipariş</div>
                    <div className="text-sm font-medium text-gray-700">Müşteri Grubu</div>
                    <div className="text-sm font-medium text-gray-700 text-center">XML</div>
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

                    return (
                      <div key={index} className="grid grid-cols-9 gap-2 mb-2">
                        <input
                          type="number"
                          placeholder="100"
                          value={stok.birim_adedi || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            updateStok(index, 'birim_adedi', isNaN(val) ? 0 : val)
                          }}
                          required
                          step="0.01"
                          min="0"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={stok.birim_turu || 'gr'}
                          onChange={(e) => {
                            const yeniBirim = e.target.value
                            const newStoklar = [...stoklar]
                            newStoklar[index] = { ...newStoklar[index], birim_turu: yeniBirim }

                            // Birim türü değiştiğinde stok birimini otomatik ayarla
                            if (yeniBirim === 'adet') {
                              newStoklar[index].stok_birimi = 'adet'
                            } else if (yeniBirim === 'kg') {
                              newStoklar[index].stok_birimi = 'kg'
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
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="adet">Adet</option>
                          <option value="gr">GR</option>
                          <option value="kg">KG</option>
                        </select>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={stok.fiyat || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            updateStok(index, 'fiyat', isNaN(val) ? 0 : val)
                          }}
                          required
                          step="0.01"
                          min="0"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Miktar"
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
                          step="0.01"
                          min={stok.birim_turu === stok.stok_birimi ? (stok.birim_adedi || 0) : 0}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={stok.stok_birimi || stok.birim_turu || 'gr'}
                          onChange={(e) => updateStok(index, 'stok_birimi', e.target.value)}
                          required
                          className="px-2 py-1 border rounded text-sm"
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
                          value={stok.min_siparis_miktari || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 1 : parseFloat(e.target.value)
                            updateStok(index, 'min_siparis_miktari', isNaN(val) ? 1 : val)
                          }}
                          required
                          min="1"
                          step="1"
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <select
                          value={stok.stok_grubu || 'hepsi'}
                          onChange={(e) => updateStok(index, 'stok_grubu', e.target.value)}
                          required
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="hepsi">Hepsi</option>
                          <option value="musteri">Müşteri</option>
                          <option value="bayi">Bayi</option>
                        </select>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={stok.xml_export || false}
                            onChange={(e) => updateStok(index, 'xml_export', e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                            title="XML'e gönder"
                          />
                        </div>
                        {stoklar.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStok(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
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
