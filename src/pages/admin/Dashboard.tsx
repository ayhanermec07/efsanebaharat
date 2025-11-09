import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Megaphone,
  Image,
  Star,
  MessageSquare,
  Truck,
  Store,
  BarChart3,
  TrendingDown,
  Activity,
  Download,
  Eye
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Stats {
  toplamUrun: number
  toplamSiparis: number
  toplamMusteri: number
  toplamGelir: number
  bekleyenSorular: number
  aktifKampanyalar: number
  aktifBayiler: number
  kargoBekleyen: number
  bannerSayisi: number
  onerilenUrunler: number
}

interface QuickAccessCard {
  title: string
  value: string | number
  icon: any
  color: string
  link: string
}

interface EnCokSatanUrun {
  urun_adi: string
  toplam_satis: number
}

interface EnCokZiyaretEdilen {
  urun_adi: string
  ziyaret_sayisi: number
}

interface GunlukSatis {
  tarih: string
  tutar: number
}

interface AylikSatis {
  ay: string
  tutar: number
}

interface DashboardData {
  stats: Stats
  enCokSatanlar: EnCokSatanUrun[]
  enCokZiyaretEdilen: EnCokZiyaretEdilen[]
  gunlukSatislar: GunlukSatis[]
  aylikSatislar: AylikSatis[]
}

// Skeleton Loader Component
function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        <div className="w-16 h-6 bg-gray-200 rounded" />
      </div>
      <div className="h-8 bg-gray-200 rounded mb-2 w-24" />
      <div className="h-4 bg-gray-200 rounded w-32" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
      <div className="h-[300px] bg-gray-200 rounded" />
    </div>
  )
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const enCokSatanChartRef = useRef<any>(null)
  const enCokZiyaretChartRef = useRef<any>(null)
  const gunlukSatisChartRef = useRef<any>(null)
  const aylikSatisChartRef = useRef<any>(null)

  useEffect(() => {
    loadDashboardData()
  }, [period])

  async function loadDashboardData() {
    try {
      setLoading(true)

      const dashboardUrl = 'https://uvagzvevktzzfrzkvtsd.supabase.co/functions/v1/dashboard-data'
      console.log('Dashboard URL:', dashboardUrl)
      
      const response = await fetch(dashboardUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2YWd6dmV2a3R6emZyemt2dHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzA1NDMsImV4cCI6MjA3Nzg0NjU0M30.ENrSW4rJmbwEWi6eSynCuXv8CdC9JroK-fpiIiVYwP0`
        },
        body: JSON.stringify({ period })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Dashboard verileri yüklenemedi')
      }

      setDashboardData(result.data)
    } catch (error: any) {
      console.error('Dashboard veri yükleme hatası:', error)
      toast.error('Dashboard verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function exportChartAsPNG(chartRef: any, fileName: string) {
    if (!chartRef.current) {
      toast.error('Grafik bulunamadı')
      return
    }

    try {
      const svgElement = chartRef.current.container.querySelector('svg')
      if (!svgElement) {
        toast.error('Grafik dışa aktarılamadı')
        return
      }

      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a')
            link.download = `${fileName}.png`
            link.href = URL.createObjectURL(blob)
            link.click()
            toast.success('Grafik indirildi')
          }
        })
        
        URL.revokeObjectURL(url)
      }

      img.src = url
    } catch (error) {
      console.error('Export hatası:', error)
      toast.error('Grafik dışa aktarılamadı')
    }
  }

  const stats = dashboardData?.stats || {
    toplamUrun: 0,
    toplamSiparis: 0,
    toplamMusteri: 0,
    toplamGelir: 0,
    bekleyenSorular: 0,
    aktifKampanyalar: 0,
    aktifBayiler: 0,
    kargoBekleyen: 0,
    bannerSayisi: 0,
    onerilenUrunler: 0
  }

  const quickAccessCards: QuickAccessCard[] = [
    { title: 'Ürünler', value: stats.toplamUrun, icon: Package, color: 'blue', link: '/admin/urunler' },
    { title: 'Siparişler', value: stats.toplamSiparis, icon: ShoppingCart, color: 'green', link: '/admin/siparisler' },
    { title: 'Kampanyalar', value: stats.aktifKampanyalar, icon: Megaphone, color: 'purple', link: '/admin/kampanyalar' },
    { title: 'Bannerlar', value: stats.bannerSayisi, icon: Image, color: 'pink', link: '/admin/bannerlar' },
    { title: 'Önerilen Ürünler', value: stats.onerilenUrunler, icon: Star, color: 'yellow', link: '/admin/urunler' },
    { title: 'Sorular', value: stats.bekleyenSorular, icon: MessageSquare, color: 'red', link: '/admin/sorular' },
    { title: 'Kargo', value: stats.kargoBekleyen, icon: Truck, color: 'orange', link: '/admin/kargo' },
    { title: 'Bayiler', value: stats.aktifBayiler, icon: Store, color: 'indigo', link: '/admin/bayiler' },
    { title: 'Bayi Satışları', value: 'Rapor', icon: BarChart3, color: 'teal', link: '/admin/bayi-satislari' }
  ]

  const mainStats = [
    {
      title: 'Toplam Gelir',
      value: `${stats.toplamGelir.toFixed(2)} TL`,
      icon: TrendingUp,
      color: 'bg-green-500',
      trend: '+12%',
      trendUp: true
    },
    {
      title: 'Toplam Ürün',
      value: stats.toplamUrun,
      icon: Package,
      color: 'bg-blue-500',
      trend: '+5',
      trendUp: true
    },
    {
      title: 'Toplam Müşteri',
      value: stats.toplamMusteri,
      icon: Users,
      color: 'bg-purple-500',
      trend: '+18',
      trendUp: true
    },
    {
      title: 'Bekleyen Sorular',
      value: stats.bekleyenSorular,
      icon: MessageSquare,
      color: 'bg-orange-500',
      trend: stats.bekleyenSorular > 0 ? `${stats.bekleyenSorular}` : '0',
      trendUp: false
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kontrol Paneli</h1>
        <p className="text-gray-600 mt-2">Sistemin genel durumunu takip edin</p>
      </div>

      {/* Main Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{stat.trend}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.title}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Access Cards */}
      {loading ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickAccessCards.map((card) => {
              const Icon = card.icon
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                green: 'bg-green-50 text-green-600 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
                pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
                yellow: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
                red: 'bg-red-50 text-red-600 hover:bg-red-100',
                orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
                indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
                teal: 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              }

              return (
                <Link
                  key={card.title}
                  to={card.link}
                  className={`${colorClasses[card.color as keyof typeof colorClasses]} rounded-lg p-4 transition-all hover:scale-105 hover:shadow-md`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Icon className="w-8 h-8" />
                    <div className="text-2xl font-bold">{card.value}</div>
                    <div className="text-sm font-medium">{card.title}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts Section Row 1 */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* En Çok Satan Ürünler */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">En Çok Satan Ürünler</h2>
              <button
                onClick={() => exportChartAsPNG(enCokSatanChartRef, 'en-cok-satan-urunler')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="PNG olarak indir"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            {dashboardData?.enCokSatanlar && dashboardData.enCokSatanlar.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {/* @ts-ignore */}
                <BarChart data={dashboardData.enCokSatanlar} layout="vertical" ref={enCokSatanChartRef}>
                  {/* @ts-ignore */}
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* @ts-ignore */}
                  <XAxis type="number" />
                  {/* @ts-ignore */}
                  <YAxis dataKey="urun_adi" type="category" width={120} />
                  {/* @ts-ignore */}
                  <Tooltip />
                  {/* @ts-ignore */}
                  <Bar dataKey="toplam_satis" fill="#3B82F6" name="Satış Adedi" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Henüz satış verisi bulunmuyor
              </div>
            )}
          </div>

          {/* En Çok Ziyaret Edilen Ürünler */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">En Çok Ziyaret Edilen</h2>
              <button
                onClick={() => exportChartAsPNG(enCokZiyaretChartRef, 'en-cok-ziyaret-edilen')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="PNG olarak indir"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            {dashboardData?.enCokZiyaretEdilen && dashboardData.enCokZiyaretEdilen.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {/* @ts-ignore */}
                <BarChart data={dashboardData.enCokZiyaretEdilen} ref={enCokZiyaretChartRef}>
                  {/* @ts-ignore */}
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* @ts-ignore */}
                  <XAxis dataKey="urun_adi" angle={-45} textAnchor="end" height={100} />
                  {/* @ts-ignore */}
                  <YAxis />
                  {/* @ts-ignore */}
                  <Tooltip />
                  {/* @ts-ignore */}
                  <Bar dataKey="ziyaret_sayisi" fill="#F59E0B" name="Ziyaret" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Henüz ziyaret verisi bulunmuyor
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Section Row 2 */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Günlük Satış Trendi */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Satış Trendi</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPeriod(7)}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    period === 7 ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  7 Gün
                </button>
                <button
                  onClick={() => setPeriod(30)}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    period === 30 ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  30 Gün
                </button>
                <button
                  onClick={() => setPeriod(90)}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    period === 90 ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  90 Gün
                </button>
                <button
                  onClick={() => exportChartAsPNG(gunlukSatisChartRef, 'gunluk-satis-trendi')}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="PNG olarak indir"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            {dashboardData?.gunlukSatislar && dashboardData.gunlukSatislar.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {/* @ts-ignore */}
                <LineChart data={dashboardData.gunlukSatislar} ref={gunlukSatisChartRef}>
                  {/* @ts-ignore */}
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* @ts-ignore */}
                  <XAxis dataKey="tarih" />
                  {/* @ts-ignore */}
                  <YAxis />
                  {/* @ts-ignore */}
                  <Tooltip formatter={(value) => `${value} TL`} />
                  {/* @ts-ignore */}
                  <Legend />
                  {/* @ts-ignore */}
                  <Line type="monotone" dataKey="tutar" stroke="#10B981" strokeWidth={2} name="Satış (TL)" dot={{ fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Bu dönem için satış verisi bulunmuyor
              </div>
            )}
          </div>

          {/* Aylık Satış Karşılaştırması */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Aylık Satış Karşılaştırması</h2>
              <button
                onClick={() => exportChartAsPNG(aylikSatisChartRef, 'aylik-satis-karsilastirmasi')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="PNG olarak indir"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            {dashboardData?.aylikSatislar && dashboardData.aylikSatislar.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {/* @ts-ignore */}
                <BarChart data={dashboardData.aylikSatislar} ref={aylikSatisChartRef}>
                  {/* @ts-ignore */}
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* @ts-ignore */}
                  <XAxis dataKey="ay" />
                  {/* @ts-ignore */}
                  <YAxis />
                  {/* @ts-ignore */}
                  <Tooltip formatter={(value) => `${value} TL`} />
                  {/* @ts-ignore */}
                  <Legend />
                  {/* @ts-ignore */}
                  <Bar dataKey="tutar" fill="#10B981" name="Aylık Satış (TL)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Henüz aylık satış verisi bulunmuyor
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Son Aktiviteler</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Yeni sipariş alındı</p>
              <p className="text-xs text-gray-500">2 dakika önce</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Yeni müşteri kaydı</p>
              <p className="text-xs text-gray-500">15 dakika önce</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Yeni soru geldi</p>
              <p className="text-xs text-gray-500">1 saat önce</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
