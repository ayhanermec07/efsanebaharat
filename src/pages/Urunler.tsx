import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, SlidersHorizontal, Eye, ShoppingCart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { kademeliIskontoUygula } from '../utils/iskonto'
import UrunKart from '../components/UrunKart'

export default function Urunler() {
  const { user, musteriData, grupIskontoOrani, ozelIskontoOrani } = useAuth()
  const { sepeteEkle } = useSepet()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [urunler, setUrunler] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aramaText, setAramaText] = useState('')
  const [secilenKategori, setSecilenKategori] = useState(searchParams.get('kategori') || '')
  const [secilenMarka, setSecilenMarka] = useState('')
  const [secilenKampanya, setSecilenKampanya] = useState(searchParams.get('kampanya') || '')


  useEffect(() => {
    loadKategoriler()
    loadMarkalar()
  }, [])

  // URL parametrelerini dinle ve state'i güncelle
  useEffect(() => {
    const kategoriParam = searchParams.get('kategori')
    const qParam = searchParams.get('q')

    setSecilenKategori(kategoriParam || '')
    if (qParam) {
      setAramaText(qParam)
    }
    const kampanyaParam = searchParams.get('kampanya')
    setSecilenKampanya(kampanyaParam || '')

  }, [searchParams])

  useEffect(() => {
    loadUrunler()
  }, [secilenKategori, secilenMarka, aramaText, secilenKampanya])

  async function loadKategoriler() {
    const { data } = await supabase
      .from('kategoriler')
      .select('*')
      .eq('aktif_durum', true)
      .order('kategori_adi')

    if (data) setKategoriler(data)
  }

  async function loadMarkalar() {
    const { data } = await supabase
      .from('markalar')
      .select('*')
      .eq('aktif_durum', true)
      .order('marka_adi')

    if (data) setMarkalar(data)
  }

  async function loadUrunler() {
    setLoading(true)
    let query = supabase
      .from('urunler')
      .select('*')
      .eq('aktif_durum', true)

    if (secilenKategori) {
      query = query.eq('kategori_id', secilenKategori)
    }

    if (secilenMarka) {
      query = query.eq('marka_id', secilenMarka)
    }

    if (aramaText) {
      query = query.ilike('urun_adi', `%${aramaText}%`)
    }

    if (secilenKampanya) {
      const { data: camp } = await supabase.from('kampanyalar').select('*').eq('id', secilenKampanya).single();
      if (camp) {
        if (camp.kapsam === 'secili_urunler') {
          const { data: pids } = await supabase.from('kampanya_urunler').select('urun_id').eq('kampanya_id', secilenKampanya);
          if (pids) {
            const ids = pids.map(p => p.urun_id);
            if (ids.length > 0) query = query.in('id', ids);
            else query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // No products
          }
        } else if (camp.kapsam === 'kategori' && camp.kategori_id) {
          query = query.eq('kategori_id', camp.kategori_id);
        } else if (camp.kapsam === 'marka' && camp.marka_id) {
          query = query.eq('marka_id', camp.marka_id);
        }
      }
    }

    const { data } = await query

    if (data && data.length > 0) {
      // Ürün görselleri ve stokları ayrı çek
      const urunIds = data.map(u => u.id)

      const [{ data: gorseller }, { data: stoklar }, { data: kategorilerData }, { data: markalarData }] = await Promise.all([
        supabase.from('urun_gorselleri').select('*').in('urun_id', urunIds).order('sira_no'),
        supabase.from('urun_stoklari').select('*').in('urun_id', urunIds).eq('aktif_durum', true),
        supabase.from('kategoriler').select('id, kategori_adi').in('id', [...new Set(data.map(u => u.kategori_id))]),
        supabase.from('markalar').select('id, marka_adi').in('id', [...new Set(data.map(u => u.marka_id))])
      ])

      // Ürünlere ilişkili verileri ekle
      // Kullanıcı tipine göre stok filtreleme (ziyaretçiler müşteri stokları görür)
      const musteriTipi = musteriData?.musteri_tipi || 'musteri'

      const urunlerWithData = data.map(urun => {
        const urunStoklari = stoklar?.filter(s => s.urun_id === urun.id) || []
        const filtreliStoklar = urunStoklari.filter(s =>
          !s.stok_grubu || s.stok_grubu === 'hepsi' || s.stok_grubu === musteriTipi
        )

        return {
          ...urun,
          urun_gorselleri: gorseller?.filter(g => g.urun_id === urun.id) || [],
          urun_stoklari: filtreliStoklar,
          kategoriler: kategorilerData?.find(k => k.id === urun.kategori_id),
          markalar: markalarData?.find(m => m.id === urun.marka_id)
        }
      })

      setUrunler(urunlerWithData)
    } else {
      setUrunler([])
    }

    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Ürünler</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filtreler */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Filtreler</h2>
              </div>
              <button
                className="lg:hidden text-gray-500 hover:text-gray-700"
                onClick={() => document.getElementById('mobile-filters')?.classList.toggle('hidden')}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div id="mobile-filters" className="hidden lg:block space-y-6">
              {/* Arama */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ürün Ara
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={aramaText}
                    onChange={(e) => setAramaText(e.target.value)}
                    placeholder="Ürün adı..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Kategori */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={secilenKategori}
                  onChange={(e) => setSecilenKategori(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Tüm Kategoriler</option>
                  {kategoriler.map((kat) => (
                    <option key={kat.id} value={kat.id}>
                      {kat.kategori_adi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marka */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marka
                </label>
                <select
                  value={secilenMarka}
                  onChange={(e) => setSecilenMarka(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Tüm Markalar</option>
                  {markalar.map((marka) => (
                    <option key={marka.id} value={marka.id}>
                      {marka.marka_adi}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setSecilenKategori('')
                  setSecilenMarka('')
                  setAramaText('')
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Ürün Listesi */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : urunler.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Ürün bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {urunler.map((urun) => {
                const ilkGorsel = urun.urun_gorselleri?.[0]?.gorsel_url
                return (
                  <div key={urun.id} className="h-full">
                    <UrunKart urun={urun} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
