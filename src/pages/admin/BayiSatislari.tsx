import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart3, Download, Calendar, Filter, TrendingUp, DollarSign, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface Bayi {
  id: string
  bayii_kodu: string
  bayi_adi: string
}

interface Kategori {
  id: string
  ad: string
}

interface Satis {
  id: string
  bayi_id: string
  siparis_id: string
  satis_tarihi: string
  toplam_tutar: number
  urun_adedi: number
  bayi?: {
    bayii_kodu: string
    bayi_adi: string
  }
}

interface Stats {
  toplamSatis: number
  toplamSiparis: number
  toplamUrunAdedi: number
}

export default function AdminBayiSatislari() {
  const [bayiler, setBayiler] = useState<Bayi[]>([])
  const [kategoriler, setKategoriler] = useState<Kategori[]>([])
  const [satislar, setSatislar] = useState<Satis[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    toplamSatis: 0,
    toplamSiparis: 0,
    toplamUrunAdedi: 0
  })

  // Filtreler
  const [selectedBayi, setSelectedBayi] = useState<string>('all')
  const [selectedKategori, setSelectedKategori] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!loading) {
      loadSatislar()
    }
  }, [selectedBayi, selectedKategori, startDate, endDate])

  async function loadInitialData() {
    try {
      setLoading(true)

      // Bayiler yükle
      const { data: bayilerData, error: bayilerError } = await supabase
        .from('bayiler')
        .select('id, bayii_kodu, bayi_adi')
        .eq('aktif', true)
        .order('bayi_adi')

      if (bayilerError) throw bayilerError
      setBayiler(bayilerData || [])

      // Kategoriler yükle
      const { data: kategorilerData, error: kategorilerError } = await supabase
        .from('kategoriler')
        .select('id, ad')
        .order('ad')

      if (kategorilerError) throw kategorilerError
      setKategoriler(kategorilerData || [])

      await loadSatislar()
    } catch (error: any) {
      console.error('Veri yükleme hatası:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadSatislar() {
    try {
      let query = supabase
        .from('bayi_satislari')
        .select('*')
        .order('satis_tarihi', { ascending: false })

      // Bayi filtresi
      if (selectedBayi !== 'all') {
        query = query.eq('bayi_id', selectedBayi)
      }

      // Tarih filtreleri
      if (startDate) {
        query = query.gte('satis_tarihi', startDate)
      }
      if (endDate) {
        query = query.lte('satis_tarihi', endDate)
      }

      const { data: satislarData, error: satislarError } = await query

      if (satislarError) throw satislarError

      // Bayi bilgilerini manuel ekle
      const satislarWithBayi = await Promise.all(
        (satislarData || []).map(async (satis) => {
          const { data: bayiData } = await supabase
            .from('bayiler')
            .select('bayii_kodu, bayi_adi')
            .eq('id', satis.bayi_id)
            .single()

          return {
            ...satis,
            bayi: bayiData
          }
        })
      )

      setSatislar(satislarWithBayi)

      // İstatistikleri hesapla
      const toplamSatis = satislarWithBayi.reduce((sum, s) => sum + s.toplam_tutar, 0)
      const toplamUrunAdedi = satislarWithBayi.reduce((sum, s) => sum + s.urun_adedi, 0)

      setStats({
        toplamSatis,
        toplamSiparis: satislarWithBayi.length,
        toplamUrunAdedi
      })
    } catch (error: any) {
      console.error('Satış yükleme hatası:', error)
      toast.error('Satışlar yüklenemedi')
    }
  }

  function resetFilters() {
    setSelectedBayi('all')
    setSelectedKategori('all')
    setStartDate('')
    setEndDate('')
  }

  function exportToExcel() {
    if (satislar.length === 0) {
      toast.error('Dışa aktarılacak veri yok')
      return
    }

    const exportData = satislar.map((satis) => ({
      'Tarih': new Date(satis.satis_tarihi).toLocaleDateString('tr-TR'),
      'Bayii Kodu': satis.bayi?.bayii_kodu || '-',
      'Bayi Adı': satis.bayi?.bayi_adi || '-',
      'Sipariş ID': satis.siparis_id,
      'Ürün Adedi': satis.urun_adedi,
      'Toplam Tutar': `${satis.toplam_tutar.toFixed(2)} ₺`
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bayi Satışları')

    // Sütun genişlikleri ayarla
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 36 },
      { wch: 12 },
      { wch: 15 }
    ]

    const fileName = `bayi-satislari-${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
    toast.success('Excel dosyası indirildi')
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          Bayi Satış Raporları
        </h1>
        <p className="text-gray-600 mt-2">
          Bayi bazlı satış performansını izleyin ve raporlayın
        </p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Toplam Satış</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.toplamSatis.toFixed(2)} ₺
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-800">{stats.toplamSiparis}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-800">{stats.toplamUrunAdedi}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Filtreler</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Bayi Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bayi
            </label>
            <select
              value={selectedBayi}
              onChange={(e) => setSelectedBayi(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Tüm Bayiler</option>
              {bayiler.map((bayi) => (
                <option key={bayi.id} value={bayi.id}>
                  {bayi.bayi_adi} ({bayi.bayii_kodu})
                </option>
              ))}
            </select>
          </div>

          {/* Başlangıç Tarihi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Bitiş Tarihi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Filtre Butonları */}
          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Sıfırla
            </button>
            <button
              onClick={exportToExcel}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              title="Excel'e Aktar"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Satışlar Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {satislar.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {selectedBayi !== 'all' || startDate || endDate
                ? 'Seçilen kriterlere uygun satış bulunamadı'
                : 'Henüz bayi satışı bulunmuyor'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bayii Kodu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bayi Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(satis.satis_tarihi).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {satis.bayi?.bayii_kodu || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {satis.bayi?.bayi_adi || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {satis.siparis_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {satis.urun_adedi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {satis.toplam_tutar.toFixed(2)} ₺
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sonuç Sayısı */}
      {satislar.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Toplam {satislar.length} satış kaydı gösteriliyor
        </div>
      )}
    </div>
  )
}
