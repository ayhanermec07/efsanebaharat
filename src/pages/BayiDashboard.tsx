import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Store, ShoppingCart, Package, TrendingUp, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrice } from '../lib/currency'

interface BayiData {
  id: string
  bayii_kodu: string
  bayi_adi: string
  yetkili_kisi: string
  email: string
}

interface SatisData {
  id: string
  satis_tarihi: string
  toplam_tutar: number
  urun_adedi: number
}

export default function BayiDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [bayi, setBayi] = useState<BayiData | null>(null)
  const [satislar, setSatislar] = useState<SatisData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [stats, setStats] = useState({
    toplamSatis: 0,
    toplamUrun: 0,
    buAySatis: 0
  })

  const loadBayiData = useCallback(async () => {
    if (!user) {
      return
    }

    try {
      setLoading(true)
      setLoadError(false)

      const { data: bayiData, error: bayiError } = await supabase
        .from('bayiler')
        .select('*')
        .eq('kullanici_id', user.id)
        .maybeSingle()

      if (bayiError) throw bayiError

      if (!bayiData) {
        navigate('/bayi-panel')
        return
      }

      if (!bayiData.aktif) {
        navigate('/bayi-panel')
        return
      }

      setBayi(bayiData)

      const { data: satisData, error: satisError } = await supabase
        .from('bayi_satislari')
        .select('*')
        .eq('bayi_id', bayiData.id)
        .order('satis_tarihi', { ascending: false })
        .limit(10)

      if (satisError) throw satisError

      setSatislar(satisData || [])

      if (satisData && satisData.length > 0) {
        const toplamSatis = satisData.reduce((sum, s) => sum + Number(s.toplam_tutar), 0)
        const toplamUrun = satisData.reduce((sum, s) => sum + s.urun_adedi, 0)

        const buAyBaslangic = new Date()
        buAyBaslangic.setDate(1)
        buAyBaslangic.setHours(0, 0, 0, 0)

        const buAySatis = satisData
          .filter(s => new Date(s.satis_tarihi) >= buAyBaslangic)
          .reduce((sum, s) => sum + Number(s.toplam_tutar), 0)

        setStats({
          toplamSatis,
          toplamUrun,
          buAySatis
        })
      } else {
        setStats({
          toplamSatis: 0,
          toplamUrun: 0,
          buAySatis: 0
        })
      }
    } catch (error: any) {
      console.error('Bayi verileri yükleme hatası:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [navigate, user])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/giris')
      return
    }

    if (user) {
      loadBayiData()
    }
  }, [authLoading, loadBayiData, navigate, user])

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('Çıkış yapıldı')
      navigate('/giris')
    } catch (error) {
      console.error('Çıkış hatası:', error)
      navigate('/giris')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return <main className="shop-container py-16 text-center" role="alert"><p>Bayi satışları yüklenemedi.</p><button type="button" onClick={() => void loadBayiData()} className="shop-btn-primary mt-4 min-h-11">Tekrar dene</button></main>
  }

  if (!bayi) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-xl font-bold text-gray-900">{bayi.bayi_adi}</h1>
                <p className="text-sm text-gray-600">Bayii Kodu: {bayi.bayii_kodu}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-4 py-2 text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 sm:self-auto"
            >
              <LogOut className="w-5 h-5" />
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Son 10 satışın toplamı</h3>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatPrice(stats.toplamSatis)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Bu ay (son 10 kayıtta)</h3>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatPrice(stats.buAySatis)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Son 10 satışta ürün</h3>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stats.toplamUrun} Adet
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Son Satışlar</h2>
          </div>

          {satislar.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Henüz satış kaydı bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Son satışlar tablosu, yatay kaydırılabilir">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün Adedi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Toplam Tutar
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {satislar.map((satis) => (
                    <tr key={satis.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(satis.satis_tarihi).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {satis.urun_adedi} Adet
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {formatPrice(Number(satis.toplam_tutar))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">İletişim Bilgileri</h3>
          <div className="space-y-1 break-words text-blue-800">
            <p>Yetkili: {bayi.yetkili_kisi}</p>
            <p>Email: <span className="break-all">{bayi.email}</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
