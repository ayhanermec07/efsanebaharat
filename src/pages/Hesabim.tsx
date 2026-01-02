import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Package, User as UserIcon, Truck, Copy, Check, ExternalLink, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Hesabim() {
  const { user, musteriData, loading: authLoading, updateUser } = useAuth()
  const navigate = useNavigate()
  const [siparisler, setSiparisler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Profil düzenleme state'leri
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    telefon: '',
    adres: ''
  })

  const kargoFirmalari: { [key: string]: { label: string; url: string } } = {
    'aras': {
      label: 'Aras Kargo',
      url: 'https://kargotakip.araskargo.com.tr/mainpage.aspx?code='
    },
    'yurtici': {
      label: 'Yurtiçi Kargo',
      url: 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code='
    },
    'ptt': {
      label: 'PTT Kargo',
      url: 'https://gonderitakip.ptt.gov.tr/Track/Verify?q='
    },
    'ups': {
      label: 'UPS',
      url: 'https://www.ups.com/track?loc=tr_TR&tracknum='
    },
    'dhl': {
      label: 'DHL',
      url: 'https://www.dhl.com/tr-tr/home/tracking.html?tracking-id='
    },
    'mng': {
      label: 'MNG Kargo',
      url: 'https://www.mngkargo.com.tr/track/'
    },
    'kargo_turkiye': {
      label: 'Kargo Türkiye',
      url: 'https://www.kargoturkiye.net/kargo-sorgulama/'
    },
    'hepsijet': {
      label: 'HepsiJet',
      url: 'https://hepsijet.com/kargo-takip?code='
    }
  }

  const kargoDurumBadge = (durum: string) => {
    const badges: { [key: string]: { text: string; className: string } } = {
      'hazirlaniyor': { text: 'Hazırlanıyor', className: 'bg-yellow-100 text-yellow-800' },
      'kargoda': { text: 'Kargoya Verildi', className: 'bg-blue-100 text-blue-800' },
      'teslim_edildi': { text: 'Teslim Edildi', className: 'bg-green-100 text-green-800' }
    }
    const badge = badges[durum] || badges['hazirlaniyor']
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}>
        {badge.text}
      </span>
    )
  }

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/giris')
    } else if (user && musteriData) {
      loadSiparisler()
    }
  }, [user, authLoading, musteriData])

  async function loadSiparisler() {
    if (!musteriData?.id) {
      console.log('Müşteri ID bulunamadı:', musteriData)
      return
    }

    setLoading(true)

    try {
      // Siparişleri çek
      const { data: siparisData, error: siparisError } = await supabase
        .from('siparisler')
        .select('*')
        .eq('musteri_id', musteriData.id)
        .order('olusturma_tarihi', { ascending: false })

      if (siparisError) throw siparisError

      if (siparisData && siparisData.length > 0) {
        // Her sipariş için ürünleri manuel olarak çek
        const siparislerWithUrunler = await Promise.all(
          siparisData.map(async (siparis) => {
            const { data: siparisUrunleri } = await supabase
              .from('siparis_urunleri')
              .select('*')
              .eq('siparis_id', siparis.id)

            if (siparisUrunleri && siparisUrunleri.length > 0) {
              // Ürün bilgilerini çek
              const urunIds = [...new Set(siparisUrunleri.map(su => su.urun_id))]
              const { data: urunler } = await supabase
                .from('urunler')
                .select('id, urun_adi')
                .in('id', urunIds)

              // Sipariş ürünlerine ürün adlarını ekle
              const detayliUrunler = siparisUrunleri.map(su => ({
                ...su,
                urun_adi: urunler?.find(u => u.id === su.urun_id)?.urun_adi || 'Ürün'
              }))

              return {
                ...siparis,
                siparis_urunleri: detayliUrunler
              }
            }

            return {
              ...siparis,
              siparis_urunleri: []
            }
          })
        )

        setSiparisler(siparislerWithUrunler)
      } else {
        setSiparisler([])
      }
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error)
      toast.error('Siparişler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Takip numarası kopyalandı')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Kopyalanamadı')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Hesabım</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profil Bilgileri */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
                {!isEditing && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {musteriData?.ad_soyad || `${musteriData?.ad} ${musteriData?.soyad}`}
                    </h2>
                    <p className="text-gray-600">{user?.email}</p>
                  </div>
                )}
              </div>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setFormData({
                      ad: musteriData?.ad || '',
                      soyad: musteriData?.soyad || '',
                      telefon: musteriData?.telefon || '',
                      adres: musteriData?.adres || ''
                    })
                    setIsEditing(true)
                  }}
                  className="text-gray-400 hover:text-orange-600 transition"
                  title="Profili Düzenle"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-red-600 transition"
                  title="İptal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                    <input
                      type="text"
                      value={formData.ad}
                      onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                    <input
                      type="text"
                      value={formData.soyad}
                      onChange={(e) => setFormData({ ...formData, soyad: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <textarea
                    rows={3}
                    value={formData.adres}
                    onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      if (!formData.ad || !formData.soyad) {
                        toast.error('Ad ve soyad zorunludur')
                        return
                      }

                      setSaving(true)
                      try {
                        await updateUser(formData)
                        setIsEditing(false)
                        toast.success('Profil güncellendi')
                      } catch (error) {
                        console.error(error)
                        toast.error('Güncelleme başarısız oldu')
                      } finally {
                        setSaving(false)
                      }
                    }}
                    disabled={saving}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Kaydet
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Müşteri Tipi</label>
                  <p className="font-medium">
                    {musteriData?.musteri_tipi === 'bayi' ? 'Bayi' : 'Bireysel Müşteri'}
                  </p>
                </div>
                {musteriData?.telefon && (
                  <div>
                    <label className="text-sm text-gray-600">Telefon</label>
                    <p className="font-medium">{musteriData.telefon}</p>
                  </div>
                )}
                {musteriData?.adres && (
                  <div>
                    <label className="text-sm text-gray-600">Adres</label>
                    <p className="font-medium">{musteriData.adres}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Siparişler */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Package className="w-6 h-6" />
              <span>Siparişlerim</span>
            </h2>

            {siparisler.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz siparişiniz bulunmuyor</p>
            ) : (
              <div className="space-y-4">
                {siparisler.map((siparis) => (
                  <div key={siparis.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Sipariş No: {siparis.siparis_no}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(siparis.olusturma_tarihi).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right">
                        {kargoDurumBadge(siparis.kargo_durumu || 'hazirlaniyor')}
                      </div>
                    </div>

                    {/* Kargo Bilgileri */}
                    {siparis.kargo_firmasi && siparis.kargo_takip_no && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-blue-900">Kargo Bilgileri</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Kargo Firması:</span>
                            <span className="font-medium text-gray-900">
                              {kargoFirmalari[siparis.kargo_firmasi]?.label || siparis.kargo_firmasi}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Takip No:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 font-mono">
                                {siparis.kargo_takip_no}
                              </span>
                              <button
                                onClick={() => copyToClipboard(siparis.kargo_takip_no, siparis.id)}
                                className="text-blue-600 hover:text-blue-700 transition"
                                title="Takip numarasını kopyala"
                              >
                                {copiedId === siparis.id ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          {siparis.tahmini_teslimat_tarihi && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">Tahmini Teslimat:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(siparis.tahmini_teslimat_tarihi).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                          )}
                          {kargoFirmalari[siparis.kargo_firmasi] && (
                            <a
                              href={`${kargoFirmalari[siparis.kargo_firmasi].url}${siparis.kargo_takip_no}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Kargonu Takip Et
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {siparis.siparis_urunleri?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.urun_adi} ({item.birim_turu}) x {item.miktar}
                          </span>
                          <span className="font-medium">{item.toplam_fiyat?.toFixed(2)} TL</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Toplam</span>
                      <span className="text-xl font-bold text-orange-600">
                        {siparis.toplam_tutar?.toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
