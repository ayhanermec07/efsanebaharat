import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  MessageSquare,
  Package,
  Filter,
  Search,
  Edit,
  X,
  CheckSquare,
  Square
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Soru {
  id: string
  kullanici_id: string
  urun_id: string | null
  konu: string
  soru_metni: string
  cevap: string | null
  durum: 'beklemede' | 'cevaplandi' | 'kapatildi'
  olusturma_tarihi: string
  cevaplanma_tarihi: string | null
  kullanici_email?: string
  urun_adi?: string
}

export default function AdminSorular() {
  const [activeTab, setActiveTab] = useState<'genel' | 'urun'>('genel')
  const [sorular, setSorular] = useState<Soru[]>([])
  const [loading, setLoading] = useState(true)
  const [durumFilter, setDurumFilter] = useState<string>('hepsi')
  const [searchTerm, setSearchTerm] = useState('')
  const [cevapModal, setCevapModal] = useState<Soru | null>(null)
  const [cevapMetni, setCevapMetni] = useState('')
  const [savingCevap, setSavingCevap] = useState(false)

  // Toplu işlemler için
  const [selectedSorular, setSelectedSorular] = useState<string[]>([])
  const [processingBulk, setProcessingBulk] = useState(false)

  useEffect(() => {
    loadSorular()
  }, [activeTab, durumFilter])

  async function loadSorular() {
    try {
      setLoading(true)

      let query = supabase
        .from('sorular')
        .select('*')
        .order('olusturma_tarihi', { ascending: false })

      // Tab'a göre filtreleme
      if (activeTab === 'genel') {
        query = query.is('urun_id', null)
      } else {
        query = query.not('urun_id', 'is', null)
      }

      // Durum filtreleme
      if (durumFilter !== 'hepsi') {
        query = query.eq('durum', durumFilter)
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        // Kullanıcı email'lerini al
        const kullaniciIds = [...new Set(data.map(s => s.kullanici_id))]

        // Supabase auth admin API'sını kullan - Uyarı: Production'da alternatif yöntem kullanılmalı
        // Şimdilik kullanıcı bilgilerini musteriler tablosundan alalım
        const { data: musterilerData } = await supabase
          .from('musteriler')
          .select('id')
          .in('id', kullaniciIds)

        // Ürün adlarını al (ürün soruları için)
        let urunler: any[] = []
        if (activeTab === 'urun') {
          const urunIds = [...new Set(data.map(s => s.urun_id).filter(Boolean))]
          if (urunIds.length > 0) {
            const { data: urunData } = await supabase
              .from('urunler')
              .select('id, urun_adi')
              .in('id', urunIds)
            urunler = urunData || []
          }
        }

        const sorularWithDetails = data.map(soru => ({
          ...soru,
          // Email bilgisi şu an veritabanında yok
          kullanici_email: 'Email Görünmüyor',
          urun_adi: urunler.find(u => u.id === soru.urun_id)?.urun_adi
        }))

        setSorular(sorularWithDetails)
      } else {
        setSorular([])
      }
    } catch (error) {
      console.error('Sorular yüklenirken hata:', error)
      toast.error('Sorular yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleCevapla(soru: Soru) {
    setCevapModal(soru)
    setCevapMetni(soru.cevap || '')
  }

  async function saveCevap() {
    if (!cevapModal) return

    if (cevapMetni.trim().length < 10) {
      toast.error('Cevap en az 10 karakter olmalıdır')
      return
    }

    setSavingCevap(true)

    try {
      const { error } = await supabase
        .from('sorular')
        .update({
          cevap: cevapMetni.trim(),
          durum: 'cevaplandi',
          cevaplanma_tarihi: new Date().toISOString(),
          guncelleme_tarihi: new Date().toISOString()
        })
        .eq('id', cevapModal.id)

      if (error) throw error

      // Email bildirimi gönder (Edge Function)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        await fetch('https://uvagzvevktzzfrzkvtsd.supabase.co/functions/v1/soru-cevap-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ soruId: cevapModal.id })
        })

        // Email gönderimi başarısız olsa bile devam et
      } catch (emailError) {
        console.warn('Email gönderilemedi:', emailError)
      }

      toast.success('Cevap başarıyla kaydedildi ve email gönderildi')
      setCevapModal(null)
      setCevapMetni('')
      loadSorular()
    } catch (error: any) {
      console.error('Cevap kaydetme hatası:', error)
      toast.error(error.message || 'Cevap kaydedilemedi')
    } finally {
      setSavingCevap(false)
    }
  }

  async function changeDurum(soruId: string, yeniDurum: string) {
    try {
      const { error } = await supabase
        .from('sorular')
        .update({
          durum: yeniDurum,
          guncelleme_tarihi: new Date().toISOString()
        })
        .eq('id', soruId)

      if (error) throw error

      toast.success('Durum güncellendi')
      loadSorular()
    } catch (error: any) {
      toast.error(error.message || 'Durum güncellenemedi')
    }
  }

  // Toplu İşlem Fonksiyonları
  function toggleSelectSoru(soruId: string) {
    setSelectedSorular(prev =>
      prev.includes(soruId)
        ? prev.filter(id => id !== soruId)
        : [...prev, soruId]
    )
  }

  function toggleSelectAll() {
    if (selectedSorular.length === filteredSorular.length) {
      setSelectedSorular([])
    } else {
      setSelectedSorular(filteredSorular.map(s => s.id))
    }
  }

  async function handleBulkDurumChange(yeniDurum: string) {
    if (selectedSorular.length === 0) {
      toast.error('Lütfen en az bir soru seçin')
      return
    }

    if (!confirm(`${selectedSorular.length} sorunun durumunu "${yeniDurum}" olarak değiştirmek istediğinize emin misiniz?`)) {
      return
    }

    setProcessingBulk(true)

    try {
      const { error } = await supabase
        .from('sorular')
        .update({
          durum: yeniDurum,
          guncelleme_tarihi: new Date().toISOString()
        })
        .in('id', selectedSorular)

      if (error) throw error

      toast.success(`${selectedSorular.length} sorunun durumu güncellendi`)
      setSelectedSorular([])
      loadSorular()
    } catch (error: any) {
      toast.error(error.message || 'Toplu işlem başarısız')
    } finally {
      setProcessingBulk(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getDurumBadge(durum: string) {
    switch (durum) {
      case 'beklemede':
        return 'bg-yellow-100 text-yellow-800'
      case 'cevaplandi':
        return 'bg-green-100 text-green-800'
      case 'kapatildi':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getDurumLabel(durum: string) {
    switch (durum) {
      case 'beklemede':
        return 'Beklemede'
      case 'cevaplandi':
        return 'Cevaplandı'
      case 'kapatildi':
        return 'Kapatıldı'
      default:
        return durum
    }
  }

  const filteredSorular = sorular.filter(soru =>
    soru.soru_metni.toLowerCase().includes(searchTerm.toLowerCase()) ||
    soru.konu.toLowerCase().includes(searchTerm.toLowerCase()) ||
    soru.kullanici_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    toplam: sorular.length,
    beklemede: sorular.filter(s => s.durum === 'beklemede').length,
    cevaplandi: sorular.filter(s => s.durum === 'cevaplandi').length
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Soru Yönetimi</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Toplam Soru</div>
          <div className="text-2xl font-bold text-gray-900">{stats.toplam}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Beklemede</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.beklemede}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Cevaplandı</div>
          <div className="text-2xl font-bold text-green-600">{stats.cevaplandi}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('genel')}
          className={`px-6 py-3 font-medium transition ${activeTab === 'genel'
            ? 'border-b-2 border-orange-600 text-orange-600'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Genel Sorular</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('urun')}
          className={`px-6 py-3 font-medium transition ${activeTab === 'urun'
            ? 'border-b-2 border-orange-600 text-orange-600'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Ürün Soruları</span>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Soru veya kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={durumFilter}
            onChange={(e) => setDurumFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="hepsi">Tüm Durumlar</option>
            <option value="beklemede">Beklemede</option>
            <option value="cevaplandi">Cevaplandı</option>
            <option value="kapatildi">Kapatıldı</option>
          </select>
        </div>
      </div>

      {/* Toplu İşlem Butonları */}
      {filteredSorular.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                {selectedSorular.length === filteredSorular.length ? (
                  <CheckSquare className="w-5 h-5 text-orange-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {selectedSorular.length > 0
                    ? `${selectedSorular.length} soru seçildi`
                    : 'Tümünü Seç'}
                </span>
              </button>
            </div>

            {selectedSorular.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkDurumChange('cevaplandi')}
                  disabled={processingBulk}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 text-sm"
                >
                  Cevaplandı Olarak İşaretle
                </button>
                <button
                  onClick={() => handleBulkDurumChange('kapatildi')}
                  disabled={processingBulk}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:bg-gray-300 text-sm"
                >
                  Kapat
                </button>
                <button
                  onClick={() => setSelectedSorular([])}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                >
                  Seçimi Temizle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sorular Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      ) : filteredSorular.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Henüz soru bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSorular.map((soru) => (
            <div key={soru.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start space-x-4 mb-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelectSoru(soru.id)}
                  className="mt-1 flex-shrink-0"
                >
                  {selectedSorular.includes(soru.id) ? (
                    <CheckSquare className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDurumBadge(soru.durum)}`}>
                          {getDurumLabel(soru.durum)}
                        </span>
                        {activeTab === 'urun' && soru.urun_adi && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {soru.urun_adi}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{soru.konu}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {soru.kullanici_email} • {formatDate(soru.olusturma_tarihi)}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCevapla(soru)}
                        className="text-blue-600 hover:text-blue-700 p-2"
                        title="Cevapla"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {soru.durum !== 'kapatildi' && (
                        <button
                          onClick={() => changeDurum(soru.id, 'kapatildi')}
                          className="text-gray-600 hover:text-gray-700 p-2"
                          title="Kapat"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Soru:</p>
                <p className="text-gray-800 mb-4">{soru.soru_metni}</p>

                {soru.cevap && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-2">Cevap:</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-gray-800">{soru.cevap}</p>
                      {soru.cevaplanma_tarihi && (
                        <p className="text-xs text-gray-500 mt-2">
                          Cevaplandı: {formatDate(soru.cevaplanma_tarihi)}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cevap Modal */}
      {cevapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Soruyu Cevapla</h2>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Kullanıcı:</p>
                <p className="text-gray-800 mb-4">{cevapModal.kullanici_email}</p>

                <p className="text-sm font-medium text-gray-700 mb-2">Konu:</p>
                <p className="text-gray-800 mb-4">{cevapModal.konu}</p>

                <p className="text-sm font-medium text-gray-700 mb-2">Soru:</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-gray-800">{cevapModal.soru_metni}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cevabınız
                </label>
                <textarea
                  value={cevapMetni}
                  onChange={(e) => setCevapMetni(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                  rows={8}
                  placeholder="Cevabınızı buraya yazın..."
                  minLength={10}
                />
                <p className="text-sm text-gray-500 mt-2">
                  Minimum 10 karakter
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveCevap}
                  disabled={savingCevap || cevapMetni.trim().length < 10}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {savingCevap ? 'Kaydediliyor...' : 'Cevabı Kaydet'}
                </button>
                <button
                  onClick={() => {
                    setCevapModal(null)
                    setCevapMetni('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
