import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSepet } from '../contexts/SepetContext'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, Check } from 'lucide-react'
import UrunSoruModul from '../components/UrunSoruModul'

export default function UrunDetay() {
  const { id } = useParams()
  const { sepeteEkle } = useSepet()
  const { user, musteriData } = useAuth()
  const [urun, setUrun] = useState<any>(null)
  const [secilenStok, setSecilenStok] = useState<any>(null)
  const [miktar, setMiktar] = useState(1)
  const [secilenGorsel, setSecilenGorsel] = useState(0)
  const [eklendi, setEklendi] = useState(false)

  // Bayi indirimi hesapla
  const bayiIndirim = musteriData?.fiyat_gruplari?.indirim_orani || 0
  const isBayi = musteriData?.musteri_tipi === 'bayi'

  useEffect(() => {
    if (id) {
      loadUrun()
      trackProductView()
    }
  }, [id])

  async function trackProductView() {
    try {
      // Ürün görüntüleme kaydı ekle
      await supabase.from('product_views').insert([{
        urun_id: id,
        user_id: user?.id || null,
        ip_address: null, // Browser'da IP alamıyoruz, Edge Function'dan alınabilir
        user_agent: navigator.userAgent
      }])
    } catch (error) {
      // Sessizce hata yakalama, kullanıcı deneyimini bozmamak için
      console.error('Product view tracking error:', error)
    }
  }

  async function loadUrun() {
    const { data } = await supabase
      .from('urunler')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (data) {
      // Görselleri, stokları, kategori ve markayı ayrı çek
      const [{ data: gorseller }, { data: stoklar }, { data: kategori }, { data: marka }] = await Promise.all([
        supabase.from('urun_gorselleri').select('*').eq('urun_id', data.id).order('sira_no'),
        supabase.from('urun_stoklari').select('*').eq('urun_id', data.id).eq('aktif_durum', true),
        supabase.from('kategoriler').select('*').eq('id', data.kategori_id).maybeSingle(),
        supabase.from('markalar').select('*').eq('id', data.marka_id).maybeSingle()
      ])
      
      const urunWithData = {
        ...data,
        urun_gorselleri: gorseller || [],
        urun_stoklari: stoklar || [],
        kategoriler: kategori,
        markalar: marka
      }
      
      setUrun(urunWithData)
      if (stoklar && stoklar.length > 0) {
        setSecilenStok(stoklar[0])
      }
    }
  }

  function handleSepeteEkle() {
    if (!urun || !secilenStok) return

    const gorsel = urun.urun_gorselleri?.[0]?.gorsel_url

    sepeteEkle({
      urun_id: urun.id,
      urun_adi: urun.urun_adi,
      birim_turu: secilenStok.birim_turu,
      birim_fiyat: secilenStok.fiyat,
      miktar,
      gorsel_url: gorsel
    })

    setEklendi(true)
    setTimeout(() => setEklendi(false), 2000)
  }

  if (!urun) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const gorseller = urun.urun_gorselleri || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Görseller */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            {gorseller.length > 0 ? (
              <img
                src={gorseller[secilenGorsel].gorsel_url}
                alt={urun.urun_adi}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-8xl font-bold">
                    {urun.urun_adi.charAt(0)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {gorseller.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {gorseller.map((gorsel: any, index: number) => (
                <button
                  key={gorsel.id}
                  onClick={() => setSecilenGorsel(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    index === secilenGorsel ? 'border-orange-600' : 'border-transparent'
                  }`}
                >
                  <img
                    src={gorsel.gorsel_url}
                    alt={`${urun.urun_adi} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ürün Bilgileri */}
        <div>
          <div className="mb-4">
            <span className="text-sm text-gray-500">{urun.markalar?.marka_adi}</span>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">{urun.urun_adi}</h1>
          </div>

          {urun.aciklama && (
            <p className="text-gray-600 mb-6">{urun.aciklama}</p>
          )}

          <div className="bg-orange-50 p-4 rounded-lg mb-6">
            {isBayi && bayiIndirim > 0 ? (
              <div>
                <p className="text-sm text-gray-600 line-through mb-1">
                  Normal Fiyat: {secilenStok?.fiyat.toFixed(2)} ₺
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-orange-600">
                    {((secilenStok?.fiyat || 0) * (1 - bayiIndirim / 100)).toFixed(2)} ₺
                  </span>
                  <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    %{bayiIndirim} Bayi İndirimi
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-3xl font-bold text-orange-600">
                {secilenStok?.fiyat.toFixed(2)} ₺
              </span>
            )}
          </div>

          {/* Birim Seçimi */}
          {urun.urun_stoklari && urun.urun_stoklari.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birim Seçin
              </label>
              <div className="grid grid-cols-3 gap-2">
                {urun.urun_stoklari.map((stok: any) => (
                  <button
                    key={stok.id}
                    onClick={() => setSecilenStok(stok)}
                    className={`p-3 border-2 rounded-lg transition ${
                      secilenStok?.id === stok.id
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold">{stok.birim_turu}</div>
                    <div className="text-sm text-gray-600">
                      {isBayi && bayiIndirim > 0 ? (
                        <>
                          <span className="line-through mr-2">{stok.fiyat.toFixed(2)} ₺</span>
                          <span className="text-orange-600 font-bold">
                            {(stok.fiyat * (1 - bayiIndirim / 100)).toFixed(2)} ₺
                          </span>
                        </>
                      ) : (
                        <span>{stok.fiyat.toFixed(2)} ₺</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Stok: {stok.stok_miktari}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Miktar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miktar
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMiktar(Math.max(1, miktar - 1))}
                className="w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                -
              </button>
              <input
                type="number"
                value={miktar}
                onChange={(e) => setMiktar(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center border border-gray-300 rounded-lg py-2"
                min="1"
              />
              <button
                onClick={() => setMiktar(miktar + 1)}
                className="w-10 h-10 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                +
              </button>
            </div>
          </div>

          {/* Sepete Ekle */}
          <button
            onClick={handleSepeteEkle}
            disabled={!secilenStok}
            className={`w-full py-4 rounded-lg font-semibold transition flex items-center justify-center space-x-2 ${
              eklendi
                ? 'bg-green-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {eklendi ? (
              <>
                <Check className="w-5 h-5" />
                <span>Sepete Eklendi</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>Sepete Ekle</span>
              </>
            )}
          </button>

          {/* Ürün Detayları */}
          <div className="mt-8 border-t pt-8">
            <h3 className="font-semibold text-gray-900 mb-4">Ürün Detayları</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Kategori:</span>
                <span className="font-medium">{urun.kategoriler?.kategori_adi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Marka:</span>
                <span className="font-medium">{urun.markalar?.marka_adi}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ürün Hakkında Soru Modülü */}
      <UrunSoruModul urunId={urun.id} urunAdi={urun.urun_adi} />
    </div>
  )
}
