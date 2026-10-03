import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { akilliBirimGoster } from '../../utils/birimDonusturucu'
import { orderPageRange, orderQueryFilters, ORDER_PAGE_SIZE } from '../../lib/admin-orders-query'
import { formatPrice } from '../../lib/currency'

type OrderFilters = { search: string; status: string; from: string; to: string }
const emptyFilters: OrderFilters = { search: '', status: '', from: '', to: '' }

export default function Siparisler() {
  const [siparisler, setSiparisler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detayModalOpen, setDetayModalOpen] = useState(false)
  const [secilenSiparis, setSecilenSiparis] = useState<any>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    async function loadSiparisler() {
      setLoading(true)
      setLoadError(false)
      try {
        const queryFilters = orderQueryFilters(filters)
        const range = orderPageRange(page)
        let query = supabase.from('siparisler').select('*', { count: 'exact' })
        if (queryFilters.searchPattern) query = query.ilike('siparis_no', queryFilters.searchPattern)
        if (queryFilters.status) query = query.eq('siparis_durumu', queryFilters.status)
        if (queryFilters.from) query = query.gte('olusturma_tarihi', queryFilters.from)
        if (queryFilters.until) query = query.lt('olusturma_tarihi', queryFilters.until)
        const { data: siparisData, error, count } = await query
          .order('olusturma_tarihi', { ascending: false })
          .order('id', { ascending: false })
          .range(range.from, range.to)
        if (error) throw error

        const musteriIds = [...new Set((siparisData || []).map(s => s.musteri_id).filter(Boolean))]
        let musteriler: any[] = []
        if (musteriIds.length > 0) {
          const { data, error: musteriError } = await supabase
            .from('musteriler')
            .select('id, ad, soyad, email, telefon')
            .in('id', musteriIds)
          if (musteriError) throw musteriError
          musteriler = data || []
        }
        if (!active) return
        setTotalCount(count || 0)
        if (page > 1 && count !== null && range.from >= count) {
          setPage(Math.max(1, Math.ceil(count / ORDER_PAGE_SIZE)))
          return
        }
        setSiparisler((siparisData || []).map(siparis => ({
          ...siparis,
          musteri: musteriler.find(m => m.id === siparis.musteri_id)
        })))
      } catch (error) {
        console.error('Sipariş yükleme hatası:', error)
        if (active) {
          setSiparisler([])
          setTotalCount(0)
          setLoadError(true)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadSiparisler()
    return () => { active = false }
  }, [filters, page, refresh])

  function updateFilters(change: Partial<OrderFilters>) {
    setPage(1)
    setFilters(current => ({ ...current, ...change }))
  }

  async function handleDurumGuncelle(siparisId: string, yeniDurum: string) {
    if (updatingOrderId) return
    const siparis = siparisler.find(item => item.id === siparisId)
    if (!siparis) return
    if (yeniDurum === 'iptal_edildi' && !window.confirm(`Sipariş ${siparis.siparis_no} için iptal/ret işlemini onaylıyor musunuz?`)) return
    setUpdatingOrderId(siparisId)
    try {
      if (siparis.odeme_durumu === 'fis_kontrol_bekliyor' ||
        (siparis.odeme_durumu === 'onaylandi' && yeniDurum === 'iptal_edildi')) {
        const decision = siparis.odeme_durumu === 'onaylandi' ? 'cancel'
          : yeniDurum === 'hazirlaniyor' ? 'approve' : yeniDurum === 'iptal_edildi' ? 'reject' : null
        if (!decision) throw new Error('Fis kontrolundeki siparis yalnizca onaylanabilir veya reddedilebilir')
        const { data, error } = await supabase.functions.invoke('admin-order-event', {
          body: { orderId: siparisId, decision }
        })
        if (error || data?.error) throw new Error(data?.error?.message || error?.message || 'Fis karari kaydedilemedi')
      } else {
        const { data, error } = await supabase.functions.invoke('admin-order-status', {
          body: { orderId: siparisId, status: yeniDurum }
        })
        if (error || data?.error) throw new Error(data?.error?.message || error?.message || 'Durum gecisi kaydedilemedi')
      }

      setRefresh(value => value + 1)
      toast.success('Sipariş durumu güncellendi!')
    } catch (error: any) {
      console.error('Durum güncelleme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function handleDetayGor(siparis: any) {
    try {
      // Sipariş ürünlerini çek
      const { data: siparisUrunleri, error: kalemHatasi } = await supabase
        .from('siparis_urunleri')
        .select('*')
        .eq('siparis_id', siparis.id)
      if (kalemHatasi) throw kalemHatasi

      if (siparisUrunleri && siparisUrunleri.length > 0) {
        // Ürün bilgilerini çek
        const urunIds = [...new Set(siparisUrunleri.map(su => su.urun_id))]
        const { data: urunler, error: urunHatasi } = await supabase
          .from('urunler')
          .select('id, urun_adi')
          .in('id', urunIds)
        if (urunHatasi) throw urunHatasi

        // Sipariş ürünlerine ürün bilgilerini ekle
        const detayliSiparisUrunleri = siparisUrunleri.map(su => ({
          ...su,
          urun: urunler?.find(u => u.id === su.urun_id)
        }))

        setSecilenSiparis({
          ...siparis,
          siparis_urunleri: detayliSiparisUrunleri
        })
      } else {
        setSecilenSiparis({
          ...siparis,
          siparis_urunleri: []
        })
      }

      setDetayModalOpen(true)
    } catch (error: any) {
      console.error('Detay görüntüleme hatası:', error)
      toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
    }
  }

  async function handleFisAc(siparisId: string, existingUrl?: string) {
    try {
      if (existingUrl?.startsWith('http')) {
        window.open(existingUrl, '_blank', 'noopener,noreferrer')
        return
      }
      const { data, error } = await supabase.functions.invoke('xml-musteri-siparis', {
        body: { action: 'receipt', orderId: siparisId }
      })
      if (error || data?.error || !data?.data?.receiptUrl) {
        throw new Error(data?.error?.message || error?.message || 'Fiş açılamadı')
      }
      window.open(data.data.receiptUrl, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      console.error('Fiş açma hatası:', error)
      toast.error(error.message || 'Fiş açılamadı')
    }
  }

  const durum_renkleri: any = {
    'beklemede': 'bg-yellow-100 text-yellow-800',
    'hazirlaniyor': 'bg-blue-100 text-blue-800',
    'kargoda': 'bg-purple-100 text-purple-800',
    'teslim_edildi': 'bg-green-100 text-green-800',
    'iptal_edildi': 'bg-red-100 text-red-800'
  }
  const durumEtiketleri: Record<string, string> = {
    beklemede: 'Beklemede', hazirlaniyor: 'Hazırlanıyor', kargoda: 'Kargoda',
    teslim_edildi: 'Teslim Edildi', iptal_edildi: 'İptal Edildi'
  }
  const izinliDurumlar = (siparis: any) => {
    const durumlar = [siparis.siparis_durumu]
    if (siparis.odeme_durumu === 'fis_kontrol_bekliyor') durumlar.push('hazirlaniyor', 'iptal_edildi')
    else {
      if (siparis.odeme_durumu === 'onaylandi' && siparis.siparis_durumu !== 'iptal_edildi') durumlar.push('iptal_edildi')
      if (['odendi', 'onaylandi'].includes(siparis.odeme_durumu) && siparis.siparis_durumu === 'beklemede') durumlar.push('hazirlaniyor')
      if (['odendi', 'onaylandi'].includes(siparis.odeme_durumu) && siparis.siparis_durumu === 'kargoda') durumlar.push('teslim_edildi')
    }
    return [...new Set(durumlar)]
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sipariş Yönetimi</h1>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <form onSubmit={event => { event.preventDefault(); updateFilters({ search: searchInput }) }} className="min-w-0 sm:col-span-2 lg:col-span-1">
          <label htmlFor="siparis-ara" className="mb-1 block text-sm font-medium text-gray-700">Sipariş no ara</label>
          <div className="flex min-w-0 gap-2">
            <input id="siparis-ara" value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength={50} placeholder="Sipariş no" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="min-h-10 rounded-lg bg-brand px-3 text-sm font-medium text-white">Ara</button>
          </div>
        </form>
        <div className="min-w-0">
          <label htmlFor="siparis-durum" className="mb-1 block text-sm font-medium text-gray-700">Durum</label>
          <select id="siparis-durum" value={filters.status} onChange={event => updateFilters({ status: event.target.value })} className="min-h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm">
            <option value="">Tüm durumlar</option>
            <option value="odeme_bekleniyor">Ödeme bekleniyor</option>
            <option value="beklemede">Beklemede</option>
            <option value="hazirlaniyor">Hazırlanıyor</option>
            <option value="kargoda">Kargoda</option>
            <option value="teslim_edildi">Teslim edildi</option>
            <option value="iptal_edildi">İptal edildi</option>
            <option value="iptal">İptal (eski)</option>
            <option value="Yeni">Yeni (eski)</option>
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="siparis-baslangic" className="mb-1 block text-sm font-medium text-gray-700">Başlangıç</label>
          <input id="siparis-baslangic" type="date" value={filters.from} max={filters.to || undefined} onChange={event => updateFilters({ from: event.target.value })} className="min-h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm" />
        </div>
        <div className="min-w-0">
          <label htmlFor="siparis-bitis" className="mb-1 block text-sm font-medium text-gray-700">Bitiş</label>
          <input id="siparis-bitis" type="date" value={filters.to} min={filters.from || undefined} onChange={event => updateFilters({ to: event.target.value })} className="min-h-10 w-full min-w-0 rounded-lg border border-gray-300 px-3 text-sm" />
        </div>
        {(filters.search || filters.status || filters.from || filters.to) && <button type="button" onClick={() => { setSearchInput(''); setPage(1); setFilters(emptyFilters) }} className="min-h-10 justify-self-start rounded-lg px-3 text-sm font-medium text-orange-700 hover:bg-orange-50">Filtreleri temizle</button>}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm text-red-700">Siparişler yüklenemedi. <button type="button" onClick={() => setRefresh(value => value + 1)} className="min-h-10 px-3 font-semibold underline">Tekrar dene</button></div>
      ) : siparisler.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">Bu ölçütlere uygun sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto" tabIndex={0} aria-label="Sipariş listesi, yatay kaydırılabilir">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş Durumu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme Durumu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {siparisler.map((siparis) => (
                <tr key={siparis.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{siparis.siparis_no}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {siparis.musteri?.ad} {siparis.musteri?.soyad}
                    {siparis.musteri?.email && <span className="block max-w-48 truncate text-xs text-gray-500" title={siparis.musteri.email}>{siparis.musteri.email}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    {formatPrice(siparis.toplam_tutar)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const durumlar = izinliDurumlar(siparis)
                      return <select
                        value={siparis.siparis_durumu}
                        onChange={(e) => handleDurumGuncelle(siparis.id, e.target.value)}
                        disabled={updatingOrderId !== null || durumlar.length === 1}
                        aria-label={`Siparis ${siparis.siparis_no} durumu`}
                        className={`px-2 py-1 rounded-full text-xs border-0 ${durum_renkleri[siparis.siparis_durumu] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {durumlar.map(durum => <option key={durum} value={durum}>{durumEtiketleri[durum] || durum}</option>)}
                      </select>
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${siparis.odeme_durumu === 'odendi' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {siparis.odeme_durumu === 'odendi' ? 'Ödendi' : siparis.odeme_durumu === 'onaylandi' ? 'Onaylandı' : siparis.odeme_durumu === 'fis_kontrol_bekliyor' ? 'Fiş kontrolü' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDetayGor(siparis)}
                      className="inline-flex min-h-10 items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4 inline" /> Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadError && totalCount > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
        <p>{totalCount} sipariş · Sayfa {page} / {Math.ceil(totalCount / ORDER_PAGE_SIZE)}</p>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Önceki</button>
          <button type="button" disabled={loading || page * ORDER_PAGE_SIZE >= totalCount} onClick={() => setPage(value => value + 1)} className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 disabled:opacity-50">Sonraki</button>
        </div>
      </div>}

      {/* Detay Modal */}
      {detayModalOpen && secilenSiparis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white sm:rounded-lg w-full max-w-3xl min-h-screen sm:min-h-0 sm:max-h-[90vh] my-0 sm:my-8 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Sipariş Detayı #{secilenSiparis.siparis_no}
                </h2>
                <button type="button" onClick={() => setDetayModalOpen(false)} aria-label="Sipariş detayını kapat" className="inline-flex min-h-10 min-w-10 items-center justify-center text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Müşteri Bilgileri */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Müşteri Bilgileri</h3>
                  <p className="text-sm text-gray-600">
                    {secilenSiparis.xml_musteri_adi || `${secilenSiparis.musteri?.ad || ''} ${secilenSiparis.musteri?.soyad || ''}`.trim() || 'Belirtilmemiş'}
                  </p>
                  {secilenSiparis.musteri?.email && <p className="break-all text-sm text-gray-600">E-posta: {secilenSiparis.musteri.email}</p>}
                  {(secilenSiparis.telefon || secilenSiparis.musteri?.telefon) && <p className="break-words text-sm text-gray-600">Telefon: {secilenSiparis.telefon || secilenSiparis.musteri.telefon}</p>}
                  {secilenSiparis.adres && <p className="whitespace-pre-wrap break-words text-sm text-gray-600">Teslimat adresi: {secilenSiparis.adres}</p>}
                </div>

                {secilenSiparis.siparis_fis_url && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Sipariş Fişi</h3>
                    <button
                      type="button"
                      onClick={() => handleFisAc(secilenSiparis.id, secilenSiparis.siparis_fis_url)}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      {secilenSiparis.siparis_fis_adi || 'Fişi aç'}
                    </button>
                  </div>
                )}

                {/* Sipariş Ürünleri */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Sipariş Ürünleri</h3>
                  <div className="max-w-full overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ürün</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Birim</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Miktar</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Birim Fiyat</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {secilenSiparis.siparis_urunleri?.map((su: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{su.urun?.urun_adi}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {akilliBirimGoster(su.birim_adedi || 100, su.birim_adedi_turu || su.birim_turu)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{su.miktar}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatPrice(su.birim_fiyat)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatPrice(su.miktar * su.birim_fiyat)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>

                {/* Toplam */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Genel Toplam:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {formatPrice(secilenSiparis.toplam_tutar)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setDetayModalOpen(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
