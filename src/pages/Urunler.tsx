import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Search, SlidersHorizontal, Eye, ShoppingCart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { kademeliIskontoUygula } from '../utils/iskonto'

export default function Urunler() {
  const { user, musteriData, grupIskontoOrani, ozelIskontoOrani } = useAuth()
  const { sepeteEkle } = useSepet()
  const [searchParams, setSearchParams] = useSearchParams()
  const [urunler, setUrunler] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aramaText, setAramaText] = useState('')
  const [secilenKategori, setSecilenKategori] = useState(searchParams.get('kategori') || '')
  const [secilenMarka, setSecilenMarka] = useState('')

  useEffect(() => {
    loadKategoriler()
    loadMarkalar()
    
    // URL'den arama parametresini al
    const qParam = searchParams.get('q')
    if (qParam) {
      setAramaText(qParam)
    }
  }, [])

  useEffect(() => {
    loadUrunler()
  }, [secilenKategori, secilenMarka, aramaText])

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
            <div className="flex items-center space-x-2 mb-6">
              <SlidersHorizontal className="w-5 h-5 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Filtreler</h2>
            </div>

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
                const ilkStok = urun.urun_stoklari?.[0]
                // Sadece giriş yapmış kullanıcılara iskonto göster
                const iskontoInfo = ilkStok && user ? kademeliIskontoUygula(ilkStok.fiyat, grupIskontoOrani, ozelIskontoOrani) : null
                
                return (
                  <div
                    key={urun.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <Link to={`/urun/${urun.id}`}>
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {ilkGorsel ? (
                          <img
                            src={ilkGorsel}
                            alt={urun.urun_adi}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-4xl font-bold">
                                {urun.urun_adi.charAt(0)}
                              </span>
                            </div>
                          </div>
                        )}
                        {iskontoInfo?.varMi && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                            %{iskontoInfo.oran} İndirim
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link to={`/urun/${urun.id}`}>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-orange-600 transition">
                          {urun.urun_adi}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 mb-2">
                        {urun.markalar?.marka_adi}
                      </p>
                      {ilkStok && iskontoInfo && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-col">
                            {iskontoInfo.varMi ? (
                              <>
                                <span className="text-orange-600 font-bold">
                                  {iskontoInfo.yeniFiyat.toFixed(2)} ₺
                                </span>
                                <span className="text-gray-400 text-xs line-through">
                                  {iskontoInfo.eskiFiyat.toFixed(2)} ₺
                                </span>
                              </>
                            ) : (
                              <span className="text-orange-600 font-bold">
                                {ilkStok.fiyat.toFixed(2)} ₺
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {ilkStok.birim_adedi || 100} {ilkStok.birim_turu?.toUpperCase() || 'GR'}
                          </span>
                        </div>
                      )}
                      {user ? (
                        // Giriş yapmış kullanıcı - Sepete Ekle butonu
                        <button
                          onClick={() => {
                            if (ilkStok && iskontoInfo) {
                              sepeteEkle({
                                urun_id: urun.id,
                                urun_adi: urun.urun_adi,
                                birim_turu: ilkStok.birim_turu,
                                birim_adedi: ilkStok.birim_adedi,
                                birim_adedi_turu: ilkStok.birim_adedi_turu || ilkStok.birim_turu,
                                birim_fiyat: iskontoInfo.yeniFiyat,
                                miktar: ilkStok.min_siparis_miktari || 1,
                                gorsel_url: ilkGorsel,
                                min_siparis_miktari: ilkStok.min_siparis_miktari
                              })
                            }
                          }}
                          disabled={!ilkStok}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Sepete Ekle</span>
                        </button>
                      ) : (
                        // Giriş yapmamış kullanıcı - Ürünü İncele butonu
                        <button
                          onClick={() => window.open(`/urun/${urun.id}`, '_blank')}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ürünü İncele</span>
                        </button>
                      )}
                    </div>
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
