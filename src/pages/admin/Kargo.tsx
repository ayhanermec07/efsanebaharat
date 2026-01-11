import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Package, Truck, X, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Siparis {
  id: string
  siparis_no: string
  musteri_id: string
  toplam_tutar: number
  siparis_durumu: string
  kargo_takip_no: string | null
  kargo_firmasi: string | null
  kargo_durumu: string
  kargoya_verilme_tarihi: string | null
  tahmini_teslimat_tarihi: string | null
  olusturma_tarihi: string
  adres: string
}

interface Musteri {
  id: string
  ad_soyad: string
  email: string
  siparisler: Siparis[]
}

interface KargoFormData {
  kargo_firmasi: string
  kargo_takip_no: string
  tahmini_teslimat_tarihi: string
}

export default function AdminKargo() {
  const [musteriler, setMusteriler] = useState<Musteri[]>([])
  const [loading, setLoading] = useState(true)
  const [kargoModal, setKargoModal] = useState<Siparis | null>(null)
  const [formData, setFormData] = useState<KargoFormData>({
    kargo_firmasi: '',
    kargo_takip_no: '',
    tahmini_teslimat_tarihi: ''
  })
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const kargoFirmalari = [
    { value: 'aras', label: 'Aras Kargo' },
    { value: 'yurtici', label: 'Yurtiçi Kargo' },
    { value: 'ptt', label: 'PTT Kargo' },
    { value: 'ups', label: 'UPS' },
    { value: 'dhl', label: 'DHL' },
    { value: 'mng', label: 'MNG Kargo' },
    { value: 'kargo_turkiye', label: 'Kargo Türkiye' },
    { value: 'hepsijet', label: 'HepsiJet' }
  ]

  const kargoDurumBadge = (durum: string) => {
    const badges: { [key: string]: { text: string; className: string } } = {
      'hazirlaniyor': { text: 'Hazırlanıyor', className: 'bg-yellow-100 text-yellow-800' },
      'kargoda': { text: 'Kargoya Verildi', className: 'bg-blue-100 text-blue-800' },
      'teslim_edildi': { text: 'Teslim Edildi', className: 'bg-green-100 text-green-800' }
    }
    const badge = badges[durum] || badges['hazirlaniyor']
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.className}`}>
        {badge.text}
      </span>
    )
  }

  useEffect(() => {
    loadMusterilerVeSiparisler()
  }, [])

  async function loadMusterilerVeSiparisler() {
    try {
      setLoading(true)

      // Tüm siparişleri çek
      const { data: siparisler, error: siparisError } = await supabase
        .from('siparisler')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })

      if (siparisError) throw siparisError

      if (!siparisler || siparisler.length === 0) {
        setMusteriler([])
        return
      }

      // Müşteri ID'lerini topla
      const musteriIds = [...new Set(siparisler.map(s => s.musteri_id))]

      // Müşteri bilgilerini çek
      const { data: musterilerData, error: musteriError } = await supabase
        .from('musteriler')
        .select('id, ad, soyad, email')
        .in('id', musteriIds)

      if (musteriError) throw musteriError

      // Müşterileri grupla ve siparişlerini ekle
      const musteriMap = new Map<string, Musteri>()

      musterilerData?.forEach(musteri => {
        musteriMap.set(musteri.id, {
          id: musteri.id,
          ad_soyad: `${musteri.ad} ${musteri.soyad}`,
          email: musteri.email,
          siparisler: []
        })
      })

      // Siparişleri müşterilere ekle
      siparisler.forEach(siparis => {
        const musteri = musteriMap.get(siparis.musteri_id)
        if (musteri) {
          musteri.siparisler.push(siparis)
        }
      })

      setMusteriler(Array.from(musteriMap.values()))
    } catch (error: any) {
      console.error('Veri yükleme hatası:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function openKargoModal(siparis: Siparis) {
    setKargoModal(siparis)
    setFormData({
      kargo_firmasi: siparis.kargo_firmasi || '',
      kargo_takip_no: siparis.kargo_takip_no || '',
      tahmini_teslimat_tarihi: siparis.tahmini_teslimat_tarihi
        ? new Date(siparis.tahmini_teslimat_tarihi).toISOString().split('T')[0]
        : ''
    })
  }

  function closeKargoModal() {
    setKargoModal(null)
    setFormData({
      kargo_firmasi: '',
      kargo_takip_no: '',
      tahmini_teslimat_tarihi: ''
    })
  }

  async function handleKargoKaydet() {
    if (!kargoModal) return

    if (!formData.kargo_firmasi) {
      toast.error('Lütfen kargo firmasını seçin')
      return
    }

    if (!formData.kargo_takip_no || formData.kargo_takip_no.trim().length < 5) {
      toast.error('Takip numarası en az 5 karakter olmalıdır')
      return
    }

    setSaving(true)

    try {
      // Sipariş güncelle
      const updateData: any = {
        kargo_firmasi: formData.kargo_firmasi,
        kargo_takip_no: formData.kargo_takip_no.trim(),
        kargo_durumu: 'kargoda',
        siparis_durumu: 'Kargoya Verildi',
        kargoya_verilme_tarihi: new Date().toISOString(),
        guncelleme_tarihi: new Date().toISOString()
      }

      if (formData.tahmini_teslimat_tarihi) {
        updateData.tahmini_teslimat_tarihi = new Date(formData.tahmini_teslimat_tarihi).toISOString()
      }

      const { error: updateError } = await supabase
        .from('siparisler')
        .update(updateData)
        .eq('id', kargoModal.id)

      if (updateError) throw updateError

      // Email bildirim gönder (Edge Function)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch('https://uvagzvevktzzfrzkvtsd.supabase.co/functions/v1/kargo-bildirim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ orderId: kargoModal.id })
        })

        if (!response.ok) {
          console.warn('Email gönderilemedi')
        }
      } catch (emailError) {
        console.warn('Email gönderimi başarısız:', emailError)
      }

      toast.success('Kargo bilgisi kaydedildi ve müşteriye email gönderildi')
      closeKargoModal()
      loadMusterilerVeSiparisler()
    } catch (error: any) {
      console.error('Kargo kaydetme hatası:', error)
      toast.error(error.message || 'Kargo bilgisi kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Kopyalandı')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Kopyalanamadı')
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Truck className="w-8 h-8 text-orange-600" />
          Kargo Yönetimi
        </h1>
        <p className="text-gray-600 mt-2">
          Siparişlere kargo bilgisi ekleyin ve müşterilerinizi bilgilendirin
        </p>
      </div>

      {musteriler.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Henüz sipariş bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-6">
          {musteriler.map(musteri => (
            <div key={musteri.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4">
                <h2 className="text-xl font-bold">{musteri.ad_soyad}</h2>
                <p className="text-orange-100 text-sm">{musteri.email}</p>
                <p className="text-orange-100 text-sm mt-1">
                  Toplam Sipariş: {musteri.siparisler.length}
                </p>
              </div>

              <div className="p-4">
                <div className="space-y-3">
                  {musteri.siparisler.map(siparis => (
                    <div
                      key={siparis.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-800">
                              {siparis.siparis_no}
                            </span>
                            {kargoDurumBadge(siparis.kargo_durumu || 'hazirlaniyor')}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Tarih: {new Date(siparis.olusturma_tarihi).toLocaleDateString('tr-TR')}</p>
                            <p>Tutar: {siparis.toplam_tutar} TL</p>

                            {siparis.kargo_firmasi && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="font-medium text-gray-700">Kargo Bilgileri:</p>
                                <p>Firma: {kargoFirmalari.find(k => k.value === siparis.kargo_firmasi)?.label}</p>
                                <div className="flex items-center gap-2">
                                  <p>Takip No: {siparis.kargo_takip_no}</p>
                                  <button
                                    onClick={() => copyToClipboard(siparis.kargo_takip_no || '', siparis.id)}
                                    className="text-orange-600 hover:text-orange-700"
                                  >
                                    {copiedId === siparis.id ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                                {siparis.tahmini_teslimat_tarihi && (
                                  <p>Tahmini Teslimat: {new Date(siparis.tahmini_teslimat_tarihi).toLocaleDateString('tr-TR')}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => openKargoModal(siparis)}
                          className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
                        >
                          <Truck className="w-4 h-4" />
                          {siparis.kargo_firmasi ? 'Güncelle' : 'Kargo Bilgisi Gir'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kargo Bilgisi Modal */}
      {kargoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                Kargo Bilgisi Gir
              </h3>
              <button
                onClick={closeKargoModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Sipariş No:</p>
                <p className="font-semibold text-gray-800">{kargoModal.siparis_no}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kargo Firması *
                </label>
                <select
                  value={formData.kargo_firmasi}
                  onChange={(e) => setFormData({ ...formData, kargo_firmasi: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {kargoFirmalari.map(firma => (
                    <option key={firma.value} value={firma.value}>
                      {firma.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Takip Numarası *
                </label>
                <input
                  type="text"
                  value={formData.kargo_takip_no}
                  onChange={(e) => setFormData({ ...formData, kargo_takip_no: e.target.value })}
                  placeholder="Kargo takip numarasını girin"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  minLength={5}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  En az 5 karakter
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tahmini Teslimat Tarihi
                </label>
                <input
                  type="date"
                  value={formData.tahmini_teslimat_tarihi}
                  onChange={(e) => setFormData({ ...formData, tahmini_teslimat_tarihi: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={closeKargoModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  İptal
                </button>
                <button
                  onClick={handleKargoKaydet}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Kaydet ve Email Gönder'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
