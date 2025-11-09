import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MessageSquare, CheckCircle, Clock, XCircle, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface Soru {
  id: string
  urun_id: string | null
  konu: string
  soru_metni: string
  cevap: string | null
  durum: 'beklemede' | 'cevaplandi' | 'kapatildi'
  olusturma_tarihi: string
  cevaplanma_tarihi: string | null
  urun_adi?: string
}

export default function Sorularim() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [sorular, setSorular] = useState<Soru[]>([])
  const [loading, setLoading] = useState(true)
  const [durumFilter, setDurumFilter] = useState<string>('hepsi')

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Bu sayfayı görüntülemek için giriş yapmalısınız')
      navigate('/giris', { state: { from: '/sorularim' } })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (user) {
      loadSorular()
    }
  }, [user, durumFilter])

  async function loadSorular() {
    if (!user) return

    try {
      setLoading(true)

      let query = supabase
        .from('sorular')
        .select('*')
        .eq('kullanici_id', user.id)
        .order('olusturma_tarihi', { ascending: false })

      if (durumFilter !== 'hepsi') {
        query = query.eq('durum', durumFilter)
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        // Ürün adlarını al
        const urunIds = [...new Set(data.map(s => s.urun_id).filter(Boolean))]
        let urunler: any[] = []

        if (urunIds.length > 0) {
          const { data: urunData } = await supabase
            .from('urunler')
            .select('id, urun_adi')
            .in('id', urunIds)
          urunler = urunData || []
        }

        const sorularWithUrun = data.map(soru => ({
          ...soru,
          urun_adi: urunler.find(u => u.id === soru.urun_id)?.urun_adi
        }))

        setSorular(sorularWithUrun)
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

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getDurumInfo(durum: string) {
    switch (durum) {
      case 'beklemede':
        return {
          icon: Clock,
          text: 'Beklemede',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        }
      case 'cevaplandi':
        return {
          icon: CheckCircle,
          text: 'Cevaplandı',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        }
      case 'kapatildi':
        return {
          icon: XCircle,
          text: 'Kapatıldı',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        }
      default:
        return {
          icon: MessageSquare,
          text: durum,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        }
    }
  }

  const stats = {
    toplam: sorular.length,
    beklemede: sorular.filter(s => s.durum === 'beklemede').length,
    cevaplandi: sorular.filter(s => s.durum === 'cevaplandi').length
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sorularım</h1>
            <p className="text-gray-600">
              Gönderdiğiniz soruların durumunu takip edebilir ve cevapları görebilirsiniz.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.toplam}</div>
                  <div className="text-sm text-gray-600">Toplam Soru</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.beklemede}</div>
                  <div className="text-sm text-gray-600">Beklemede</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.cevaplandi}</div>
                  <div className="text-sm text-gray-600">Cevaplandı</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2">
              <button
                onClick={() => setDurumFilter('hepsi')}
                className={`px-4 py-2 rounded-md transition ${
                  durumFilter === 'hepsi'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setDurumFilter('beklemede')}
                className={`px-4 py-2 rounded-md transition ${
                  durumFilter === 'beklemede'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Beklemede
              </button>
              <button
                onClick={() => setDurumFilter('cevaplandi')}
                className={`px-4 py-2 rounded-md transition ${
                  durumFilter === 'cevaplandi'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cevaplandı
              </button>
              <button
                onClick={() => setDurumFilter('kapatildi')}
                className={`px-4 py-2 rounded-md transition ${
                  durumFilter === 'kapatildi'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Kapatıldı
              </button>
            </div>
          </div>

          {/* Sorular Listesi */}
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white rounded-lg">
              <div className="text-gray-600">Yükleniyor...</div>
            </div>
          ) : sorular.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {durumFilter === 'hepsi' 
                  ? 'Henüz soru sormadınız'
                  : `${durumFilter === 'beklemede' ? 'Beklemede' : durumFilter === 'cevaplandi' ? 'Cevaplandı' : 'Kapatıldı'} durumunda soru bulunmuyor`
                }
              </p>
              <button
                onClick={() => navigate('/bize-ulasin')}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
              >
                Yeni Soru Sor
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sorular.map((soru) => {
                const durumInfo = getDurumInfo(soru.durum)
                const DurumIcon = durumInfo.icon

                return (
                  <div key={soru.id} className={`bg-white rounded-lg shadow-sm border ${durumInfo.borderColor} overflow-hidden`}>
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${durumInfo.bgColor} ${durumInfo.color} flex items-center space-x-1`}>
                              <DurumIcon className="w-4 h-4" />
                              <span>{durumInfo.text}</span>
                            </span>
                            {soru.urun_adi && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center space-x-1">
                                <Package className="w-4 h-4" />
                                <span>{soru.urun_adi}</span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-lg">{soru.konu}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Gönderilme: {formatDate(soru.olusturma_tarihi)}
                          </p>
                        </div>
                      </div>

                      {/* Soru */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Sorunuz:</p>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-800">{soru.soru_metni}</p>
                        </div>
                      </div>

                      {/* Cevap */}
                      {soru.cevap && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Cevap:</p>
                          <div className={`${durumInfo.bgColor} rounded-lg p-4 border ${durumInfo.borderColor}`}>
                            <p className="text-gray-800 mb-2">{soru.cevap}</p>
                            {soru.cevaplanma_tarihi && (
                              <p className="text-xs text-gray-600">
                                Cevaplandı: {formatDate(soru.cevaplanma_tarihi)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Beklemede Mesajı */}
                      {soru.durum === 'beklemede' && !soru.cevap && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            Sorunuz değerlendiriliyor. En kısa sürede size geri dönüş yapacağız.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Yeni Soru Sor Butonu */}
          {sorular.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/bize-ulasin')}
                className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition font-medium inline-flex items-center space-x-2"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Yeni Soru Sor</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
