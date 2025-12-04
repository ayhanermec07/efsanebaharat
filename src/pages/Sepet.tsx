import { Link, useNavigate } from 'react-router-dom'
import { useSepet } from '../contexts/SepetContext'
import { useAuth } from '../contexts/AuthContext'
import { Trash2, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { akilliBirimGoster } from '../utils/birimDonusturucu'
import KampanyaUygula from '../components/KampanyaUygula'

export default function Sepet() {
  const { sepetItems, sepettenCikar, miktarGuncelle, toplamTutar, sepetiTemizle } = useSepet()
  const { user, musteriData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPaymentIframe, setShowPaymentIframe] = useState(false)
  const [paymentToken, setPaymentToken] = useState('')
  const [uygulananKampanya, setUygulananKampanya] = useState<any>(null)
  const [kampanyaIndirimi, setKampanyaIndirimi] = useState(0)

  const kdvOrani = 0.20
  const araToplamTutar = toplamTutar / (1 + kdvOrani)
  const kdvTutari = toplamTutar - araToplamTutar
  const indirimliToplam = toplamTutar - kampanyaIndirimi

  async function handleOdemeYap() {
    if (!user || !musteriData) {
      toast.error('Ödeme yapmak için giriş yapmalısınız')
      navigate('/giris?redirect=/sepet')
      return
    }

    if (sepetItems.length === 0) {
      toast.error('Sepetiniz boş')
      return
    }

    setLoading(true)
    try {
      // PayTr edge function'ını çağır
      const { data: functionData, error: functionError } = await supabase.functions.invoke('paytr-payment', {
        body: {
          sepetItems: sepetItems.map(item => ({
            urun_adi: item.urun_adi,
            birim_fiyat: item.birim_fiyat,
            miktar: item.miktar
          })),
          musteriData: {
            ad: musteriData.ad,
            soyad: musteriData.soyad,
            email: user.email,
            telefon: musteriData.telefon,
            adres: musteriData.adres
          },
          toplamTutar: indirimliToplam,
          kampanyaKodu: uygulananKampanya?.kod,
          kampanyaIndirimi: kampanyaIndirimi
        }
      })

      if (functionError) {
        console.error('PayTr function error:', functionError)
        throw new Error('Ödeme sayfası oluşturulamadı')
      }

      if (functionData?.success && functionData?.token) {
        setPaymentToken(functionData.token)
        setShowPaymentIframe(true)
        
        // Sipariş kaydını oluştur (ödeme öncesi)
        const siparisNo = functionData.merchant_oid
        await supabase
          .from('siparisler')
          .insert({
            siparis_no: siparisNo,
            musteri_id: musteriData.id,
            toplam_tutar: indirimliToplam,
            kampanya_kodu: uygulananKampanya?.kod,
            kampanya_indirimi: kampanyaIndirimi,
            siparis_durumu: 'beklemede',
            odeme_durumu: 'bekliyor',
            adres: musteriData.adres,
            telefon: musteriData.telefon
          })
          .select()
          .maybeSingle()
          .then(async ({ data: siparis }) => {
            if (siparis) {
              // Sipariş ürünlerini ekle
              const siparisUrunleri = sepetItems.map(item => ({
                siparis_id: siparis.id,
                urun_id: item.urun_id,
                birim_turu: item.birim_turu,
                birim_adedi: item.birim_adedi,
                birim_adedi_turu: item.birim_adedi_turu,
                miktar: item.miktar,
                birim_fiyat: item.birim_fiyat,
                toplam_fiyat: item.birim_fiyat * item.miktar
              }))
              await supabase.from('siparis_urunleri').insert(siparisUrunleri)
              
              // Stokları düşür ve rezervasyonları kaldır
              for (const item of sepetItems) {
                // İlgili stok kaydını bul
                const { data: stok } = await supabase
                  .from('urun_stoklari')
                  .select('*')
                  .eq('urun_id', item.urun_id)
                  .eq('birim_turu', item.birim_turu)
                  .single()
                
                if (stok) {
                  // Satılan toplam miktarı hesapla (birim_adedi * miktar)
                  const satilanMiktar = (item.birim_adedi || 100) * item.miktar
                  
                  // Birim dönüştürme: satılan miktarı stok birimine çevir
                  let stokDusumu = satilanMiktar
                  if (item.birim_turu === 'gr' && stok.stok_birimi === 'kg') {
                    stokDusumu = satilanMiktar / 1000 // gr'ı kg'a çevir
                  } else if (item.birim_turu === 'kg' && stok.stok_birimi === 'gr') {
                    stokDusumu = satilanMiktar * 1000 // kg'ı gr'a çevir
                  }
                  
                  // Yeni stok miktarını hesapla
                  const yeniStok = Math.max(0, (stok.stok_miktari || 0) - stokDusumu)
                  
                  // Stoku güncelle
                  await supabase
                    .from('urun_stoklari')
                    .update({ stok_miktari: yeniStok })
                    .eq('id', stok.id)
                }

                // Rezervasyonu kaldır
                await supabase
                  .from('stok_rezervasyonlari')
                  .delete()
                  .eq('musteri_id', musteriData.id)
                  .eq('urun_id', item.urun_id)
                  .eq('birim_turu', item.birim_turu)
              }
            }
          })

      } else {
        throw new Error('Ödeme tokenı alınamadı')
      }
    } catch (error: any) {
      console.error('Ödeme hatası:', error)
      toast.error(error.message || 'Ödeme işlemi başlatılamadı')
    } finally {
      setLoading(false)
    }
  }

  if (showPaymentIframe && paymentToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ödeme Sayfası</h1>
            <p className="text-gray-600 mb-4">
              Güvenli ödeme sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paymentToken}`}
              id="paytriframe"
              frameBorder="0"
              scrolling="no"
              style={{ width: '100%', height: '800px' }}
            ></iframe>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowPaymentIframe(false)
                setPaymentToken('')
              }}
              className="text-orange-600 hover:text-orange-700"
            >
              Ödemeyi İptal Et
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Sepetim</h1>

      {sepetItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-6">Sepetiniz boş</p>
          <Link
            to="/urunler"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sepet Ürünleri */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              {sepetItems.map((item) => (
                <div key={`${item.urun_id}-${item.birim_turu}`} className="flex items-center gap-4 p-6 border-b last:border-b-0">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {item.gorsel_url ? (
                      <img src={item.gorsel_url} alt={item.urun_adi} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-400">{item.urun_adi.charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.urun_adi}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {akilliBirimGoster(item.birim_adedi || 100, item.birim_adedi_turu || item.birim_turu)}
                    </p>
                    <p className="text-orange-600 font-bold">{item.birim_fiyat.toFixed(2)} ₺</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => miktarGuncelle(item.urun_id, item.birim_turu, Math.max(item.min_siparis_miktari, item.miktar - 1))}
                      disabled={item.miktar <= item.min_siparis_miktari}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.miktar}</span>
                    <button
                      onClick={() => miktarGuncelle(item.urun_id, item.birim_turu, item.miktar + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-gray-900 mb-2">
                      {(item.birim_fiyat * item.miktar).toFixed(2)} ₺
                    </p>
                    <button
                      onClick={() => sepettenCikar(item.urun_id, item.birim_turu)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sipariş Özeti */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Sipariş Özeti</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Ara Toplam</span>
                  <span>{araToplamTutar.toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>KDV (%{(kdvOrani * 100).toFixed(0)})</span>
                  <span>{kdvTutari.toFixed(2)} ₺</span>
                </div>
                {kampanyaIndirimi > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Kampanya İndirimi</span>
                    <span>-{kampanyaIndirimi.toFixed(2)} ₺</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Toplam</span>
                  <span>{indirimliToplam.toFixed(2)} ₺</span>
                </div>
              </div>

              <div className="mb-6">
                <KampanyaUygula
                  sepetTutari={toplamTutar}
                  onKampanyaUygula={(kampanya, indirim) => {
                    setUygulananKampanya(kampanya)
                    setKampanyaIndirimi(indirim)
                  }}
                />
              </div>

              {user ? (
                <button
                  onClick={handleOdemeYap}
                  disabled={loading}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Ödemeye Geç</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to="/giris?redirect=/sepet"
                  className="block w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition text-center"
                >
                  Giriş Yapın
                </Link>
              )}

              <button
                onClick={sepetiTemizle}
                className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Sepeti Temizle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
